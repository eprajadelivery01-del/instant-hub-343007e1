// Edge Function: create-order
// Recalcula preços, frete e desconto no servidor para evitar manipulação client-side.
// Deploy: supabase functions deploy create-order --project-ref <REF>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CartItemInput {
  product_id: string;
  quantity: number;
  notes?: string | null;
}

interface CreateOrderBody {
  items: CartItemInput[];
  company_id: string;
  address_id: string;
  payment_method: 'money' | 'pix' | 'card';
  coupon_code?: string | null;
  notes?: string | null;
  needs_change?: boolean;
  change_for?: number | null;
  idempotency_key: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, 400);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ANON = Deno.env.get('SUPABASE_ANON_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
    return json({ error: 'Server misconfigured: missing Supabase env vars.' }, 500);
  }

  // Auth: validar JWT do cliente.
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing Authorization bearer token.' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: 'Invalid session.' }, 401);
  }
  const user = userData.user;

  // Service role para escrever orders (cliente direto está bloqueado pela policy).
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: CreateOrderBody;
  try {
    body = (await req.json()) as CreateOrderBody;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return badRequest('items is required and must be non-empty.');
  }
  if (!body.company_id) return badRequest('company_id is required.');
  if (!body.address_id) return badRequest('address_id is required.');
  if (!['money', 'pix', 'card'].includes(body.payment_method)) {
    return badRequest('payment_method must be money|pix|card.');
  }
  if (!body.idempotency_key || typeof body.idempotency_key !== 'string') {
    return badRequest('idempotency_key is required.');
  }
  for (const it of body.items) {
    if (!it.product_id || !Number.isInteger(it.quantity) || it.quantity <= 0) {
      return badRequest('each item must have product_id and integer quantity > 0.');
    }
  }

  // 1) Address pertence ao usuário
  const { data: address, error: addrErr } = await adminClient
    .from('addresses')
    .select('id, user_id, street, number, neighborhood, city, latitude, longitude')
    .eq('id', body.address_id)
    .maybeSingle();
  if (addrErr || !address || address.user_id !== user.id) {
    return json({ error: 'Address not found for this user.' }, 403);
  }

  // 2) Company existe
  const { data: company, error: compErr } = await adminClient
    .from('companies')
    .select('id, name, address, latitude, longitude, delivery_fee')
    .eq('id', body.company_id)
    .maybeSingle();
  if (compErr || !company) return badRequest('Company not found.', { company_id: body.company_id });

  // 3) Re-fetch produtos canonicamente
  const productIds = Array.from(new Set(body.items.map((i) => i.product_id)));
  const { data: products, error: prodErr } = await adminClient
    .from('products')
    .select('id, name, price, company_id, available')
    .in('id', productIds);
  if (prodErr || !products) return json({ error: 'Failed to load products.' }, 500);

  const byId = new Map(products.map((p) => [p.id, p]));
  for (const it of body.items) {
    const p = byId.get(it.product_id);
    if (!p) return badRequest(`Product ${it.product_id} not found.`);
    if (p.company_id !== company.id) return badRequest('Item does not belong to the company.');
    if (p.available === false) return badRequest(`Product ${p.name} is unavailable.`);
  }

  // 4) Subtotal canônico
  const enrichedItems = body.items.map((it) => {
    const p = byId.get(it.product_id)!;
    return {
      product_id: p.id,
      product_name: p.name,
      unit_price: Number(p.price) || 0,
      quantity: it.quantity,
      line_total: (Number(p.price) || 0) * it.quantity,
      notes: it.notes ?? null,
    };
  });
  const subtotal = enrichedItems.reduce((acc, x) => acc + x.line_total, 0);

  // 5) Cupom (server-side)
  let appliedCoupon: any = null;
  let discount = 0;
  if (body.coupon_code && body.coupon_code.trim()) {
    const code = body.coupon_code.trim().toUpperCase();
    const { data: coupon } = await adminClient
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle();
    if (!coupon) return badRequest('Invalid or inactive coupon.');
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return badRequest('Coupon expired.');
    }
    if (coupon.min_order_value && subtotal < Number(coupon.min_order_value)) {
      return badRequest('Order below coupon minimum.');
    }
    if (coupon.company_id && coupon.company_id !== company.id) {
      return badRequest('Coupon belongs to another store.');
    }
    const { data: links } = await adminClient
      .from('coupon_products')
      .select('product_id')
      .eq('coupon_id', coupon.id);
    const restrictIds = (links ?? []).map((l: any) => l.product_id);
    const eligible = restrictIds.length
      ? enrichedItems.filter((i) => restrictIds.includes(i.product_id))
      : enrichedItems;
    const eligibleSubtotal = eligible.reduce((a, x) => a + x.line_total, 0);
    if (eligibleSubtotal > 0) {
      if (coupon.discount_type === 'percentage') {
        discount = (eligibleSubtotal * Number(coupon.discount_value)) / 100;
        if (coupon.max_discount_value) {
          discount = Math.min(discount, Number(coupon.max_discount_value));
        }
      } else {
        discount = Math.min(eligibleSubtotal, Number(coupon.discount_value));
      }
    }
    appliedCoupon = coupon;
  }

  // 6) Frete: usa company.delivery_fee se existir; senão tenta região por lat/lng.
  let deliveryFee = 0;
  if (company.delivery_fee !== null && company.delivery_fee !== undefined) {
    deliveryFee = Number(company.delivery_fee) || 0;
  } else if (address.latitude && address.longitude) {
    const { data: regions } = await adminClient
      .from('regions')
      .select('id, name, fee, polygon');
    if (regions && regions.length > 0) {
      const inside = pickRegion(regions, Number(address.latitude), Number(address.longitude));
      if (inside) deliveryFee = Number(inside.fee) || 0;
    }
  }

  const total = Math.max(0, subtotal - discount) + deliveryFee;

  // 7) Garante customers vinculado
  let customerId: string | null = null;
  const { data: customer } = await adminClient
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (customer?.id) {
    customerId = customer.id;
  } else {
    const { data: created, error: createErr } = await adminClient
      .from('customers')
      .insert({
        user_id: user.id,
        name: (user.user_metadata as any)?.full_name || user.email || 'Cliente',
        phone: (user.user_metadata as any)?.phone || null,
      })
      .select('id')
      .single();
    if (createErr || !created) return json({ error: 'Failed to provision customer.' }, 500);
    customerId = created.id;
  }

  // 8) Idempotência
  const { data: existing } = await adminClient
    .from('orders')
    .select('id')
    .eq('idempotency_key', body.idempotency_key)
    .maybeSingle();
  if (existing?.id) {
    return json({ order_id: existing.id, idempotent: true });
  }

  // 9) Notas (inclui troco)
  let finalNotes = body.notes?.trim() || null;
  if (body.payment_method === 'money' && body.needs_change && body.change_for) {
    const note = `Troco para R$ ${Number(body.change_for).toFixed(2)}`;
    finalNotes = finalNotes ? `${finalNotes} • ${note}` : note;
  }

  const deliveryAddress = `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}`;

  // 10) Insert order
  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .insert({
      customer_id: customerId,
      user_id: user.id,
      company_id: company.id,
      status: 'pending',
      total,
      delivery_fee: deliveryFee,
      delivery_address: deliveryAddress,
      payment_method: body.payment_method,
      notes: finalNotes,
      idempotency_key: body.idempotency_key,
    })
    .select('id')
    .single();
  if (orderErr || !order) {
    if ((orderErr as any)?.code === '23505') {
      const { data: dup } = await adminClient
        .from('orders')
        .select('id')
        .eq('idempotency_key', body.idempotency_key)
        .maybeSingle();
      if (dup?.id) return json({ order_id: dup.id, idempotent: true });
    }
    return json({ error: orderErr?.message || 'Failed to create order.' }, 500);
  }

  // 11) Insert items
  const itemsRow = enrichedItems.map((i) => ({
    order_id: order.id,
    product_id: i.product_id,
    quantity: i.quantity,
    price: i.unit_price,
    unit_price: i.unit_price,
    product_name: i.product_name,
    notes: i.notes,
  }));
  const { error: itemsErr } = await adminClient.from('order_items').insert(itemsRow);
  if (itemsErr) {
    return json({ error: itemsErr.message, order_id: order.id }, 500);
  }

  // 12) Cupom usado
  if (appliedCoupon) {
    await adminClient.from('user_coupons').insert({
      user_id: user.id,
      coupon_id: appliedCoupon.id,
      order_id: order.id,
      used_at: new Date().toISOString(),
    });
  }

  // 13) Delivery
  await adminClient.from('deliveries').insert({
    order_id: order.id,
    company_id: company.id,
    pickup_address: company.address || company.name,
    delivery_address: deliveryAddress,
    pickup_latitude: company.latitude,
    pickup_longitude: company.longitude,
    delivery_latitude: address.latitude,
    delivery_longitude: address.longitude,
    status: 'pending',
    value: total,
    price: deliveryFee,
  });

  return json({
    order_id: order.id,
    total,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
  });
});

// Point-in-polygon ray casting; aceita polygon como GeoJSON {coordinates:[[[lng,lat]...]]}
// ou array de {lat,lng}.
function pickRegion(regions: any[], lat: number, lng: number) {
  for (const r of regions) {
    const poly = normalizePolygon(r.polygon);
    if (poly && pointInPolygon(lng, lat, poly)) return r;
  }
  return null;
}
function normalizePolygon(p: any): [number, number][] | null {
  if (!p) return null;
  try {
    if (p.type === 'Polygon' && Array.isArray(p.coordinates?.[0])) {
      return p.coordinates[0].map((c: number[]) => [c[0], c[1]] as [number, number]);
    }
    if (Array.isArray(p) && p[0]?.lat !== undefined) {
      return p.map((pt: any) => [pt.lng, pt.lat] as [number, number]);
    }
  } catch {
    return null;
  }
  return null;
}
function pointInPolygon(x: number, y: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}