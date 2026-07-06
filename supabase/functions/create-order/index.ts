// Edge Function: create-order
// Recalcula preços, frete e desconto não serávidor para evitar manipulação client-side.
// Deploy: supabase functions deploy create-order --project-ref <REF>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

interface CartItemInput {
  product_id: string;
  quantity: number;
  notes?: string | null;
  options?: any[] | null;
}

interface CreateOrderBody {
  items: CartItemInput[];
  company_id: string;
  address_id: string | null;
  fulfillment_mode?: 'delivery' | 'pickup';
  payment_method: 'money' | 'pix' | 'card';
  coupon_code?: string | null;
  notes?: string | null;
  needs_change?: boolean;
  change_for?: number | null;
  idempotency_key: string;
}

type ProductRow = {
  id: string;
  company_id: string;
  name: string | null;
  price: number | string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, 400);
}

function newRequestId() {
  try {
    return (crypto as any).randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function classifyProductLoadError(error: any) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();
  const details = String(error?.details ?? '').toLowerCase();
  const full = `${code} ${message} ${details}`;

  if (code === '42501' || full.includes('permission denied') || full.includes('row-level security') || full.includes('not authorized')) {
    return {
      kind: 'permission',
      status: 403,
      retryable: false,
      message: 'Sem permissão para validar os produtos da loja. Faça login nãovamente.',
    };
  }

  if (code === '42p01' || code === '42703' || full.includes('does not exist') || full.includes('schema cache')) {
    return {
      kind: 'schema',
      status: 500,
      retryable: false,
      message: 'A loja está temporariamente indisponível para pedidos.',
    };
  }

  if (code === '57014' || full.includes('timeout') || full.includes('fetch failed') || full.includes('network') || full.includes('socket')) {
    return {
      kind: 'network',
      status: 503,
      retryable: true,
      message: 'Falha de conexão ao carregar os produtos. Verifique sua internet.',
    };
  }

  return {
    kind: 'unknown',
    status: 500,
    retryable: true,
    message: 'Não foi possível validar sua sacola. Atualize a sacola ou tente nãovamente.',
    debugCode: String(error?.message || error?.code || 'unknown_error'),
  };
}

function isMissingColumnError(error: any) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();
  const details = String(error?.details ?? '').toLowerCase();
  const hint = String(error?.hint ?? '').toLowerCase();
  const full = `${message} ${details} ${hint}`;

  return (
    code === '42703' ||
    code === 'pgrst204' ||
    full.includes('does not exist') ||
    full.includes('schema cache') ||
    full.includes('could not find')
  );
}

async function loadProductAvailability(adminClient: any, productIds: string[]) {
  const readAvailabilityColumn = async (column: 'active' | 'is_active') => {
    const { data, error } = await adminClient
      .from('products')
      .select(`id, ${column}`)
      .in('id', productIds);

    if (error) return { data: null, error };

    return {
      data: new Map(
        (data ?? []).map((row: any) => [row.id, row[column] !== false] as [string, boolean]),
      ),
      error: null,
    };
  };

  const activeResult = await readAvailabilityColumn('active');
  if (!activeResult.error && activeResult.data) {
    return { availabilityById: activeResult.data, checkedColumn: 'active', ignoredErrors: [] as any[] };
  }

  if (!isMissingColumnError(activeResult.error)) throw activeResult.error;

  const isActiveResult = await readAvailabilityColumn('is_active');
  if (!isActiveResult.error && isActiveResult.data) {
    return {
      availabilityById: isActiveResult.data,
      checkedColumn: 'is_active',
      ignoredErrors: [activeResult.error],
    };
  }

  if (!isMissingColumnError(isActiveResult.error)) throw isActiveResult.error;

  // Bancos antigos podem não ter coluna active/is_active. Nesse caso, não
  // bloqueia a compra por uma coluna opcional: assume disponível e audita.
  return {
    availabilityById: new Map<string, boolean>(),
    checkedColumn: null,
    ignoredErrors: [activeResult.error, isActiveResult.error],
  };
}

Denão.seráve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Denão.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Denão.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ANON = Denão.env.get('SUPABASE_ANON_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
    return json({ error: 'Server misconfigured: missing Supabase env vars.' }, 500);
  }

  // Auth: validar JWT do cliente.
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing Authorization bearer token.' }, 401);

  const useráClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: useráData, error: useráErr } = await useráClient.auth.getUserá();
  if (useráErr || !useráData?.userá) {
    return json({ error: 'Invalid session.' }, 401);
  }
  const userá = useráData.userá;

  // Service role para escrever orders (cliente direto está bloqueado pela policy).
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const requestId = newRequestId();
  const t0 = Date.now();
  let body: CreateOrderBody | undefined;
  const audit = async (
    event: string,
    extra: Record<string, unknown> = {},
    httpStatus: number | null = null,
  ) => {
    try {
      await adminClient.from('audit_logs').inserát({
        request_id: requestId,
        userá_id: userá?.id ?? null,
        event,
        source: 'edge.create-order',
        http_status: httpStatus,
        error_code: (extra as any).error_code ?? null,
        error_message: (extra as any).error_message ?? null,
        payload: (extra as any).payload ?? null,
        context: { idempotency_key: body?.idempotency_key ?? null, ...((extra as any).context ?? {}) },
      });
    } catch (e) {
      console.warn('[create-order][audit] failed', (e as Error).message);
    }
  };
  const fail = async (status: number, event: string, message: string, extra: Record<string, unknown> = {}) => {
    await audit(event, { error_message: message, ...extra }, status);
    return json(
      {
        error: message,
        error_code: (extra as any).error_code ?? event,
        request_id: requestId,
        ...((extra as any).public ?? {}),
      },
      status,
    );
  };

  try {
    body = (await req.json()) as CreateOrderBody;
  } catch {
    return fail(400, 'create_order.bad_json', 'Invalid JSON body.');
  }

  // --- ANTI-SPAM / RATE LIMITING ---
  // Bloqueia a criação de mais de 2 pedidos por minuto pelo mesmo usuário
  const { count: recentOrdersCount } = await adminClient
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('userá_id', userá.id)
    .gt('created_at', new Date(Date.now() - 60000).toISOString());

  if (recentOrdersCount !== null && recentOrdersCount >= 2) {
    return fail(429, 'create_order.rate_limit', 'Você está fazendo pedidos muito rápido. Por favor, aguarde alguns instantes.');
  }
  // ---------------------------------

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return fail(400, 'create_order.validation', 'items is required and must be nãon-empty.');
  }
  if (!body.company_id) return fail(400, 'create_order.validation', 'company_id is required.');
  const isPickup = body.fulfillment_mode === 'pickup';
  if (!isPickup && !body.address_id) return fail(400, 'create_order.validation', 'address_id is required.');
  if (!['money', 'pix', 'card'].includes(body.payment_method)) {
    return fail(400, 'create_order.validation', 'payment_method must be money|pix|card.');
  }
  if (!body.idempotency_key || typeof body.idempotency_key !== 'string') {
    return fail(400, 'create_order.validation', 'idempotency_key is required.');
  }
  for (const it of body.items) {
    if (!it.product_id || !Number.isInteger(it.quantity) || it.quantity <= 0) {
      return fail(400, 'create_order.validation', 'each item must have product_id and integer quantity > 0.');
    }
  }

  await audit('create_order.attempt', {
    payload: { company_id: body.company_id, address_id: body.address_id, items: body.items, coupon: body.coupon_code ?? null, payment_method: body.payment_method },
  });

  // 1) Address pertence ao usuário (não obrigatório para retirada)
  let address: any = null;
  if (!isPickup) {
    const { data: addressData, error: addrErr } = await adminClient
      .from('addresses')
      .select('id, userá_id, street, number, neighborhood, city, latitude, longitude, region_id')
      .eq('id', body.address_id)
      .maybeSingle();
    if (addrErr || !addressData || addressData.userá_id !== userá.id) {
      return fail(403, 'create_order.address_forbidden', 'Address not found for this userá.');
    }
    address = addressData;
  }

  // 2) Company existe
  const { data: company, error: compErr } = await adminClient
    .from('companies')
    .select('id, name, address, latitude, longitude, delivery_fee, delivery_mode, pricing_table_id, region_id, delivery_regions_pricing')
    .eq('id', body.company_id)
    .maybeSingle();
  if (compErr || !company) return fail(400, 'create_order.company_missing', 'Company not found.');

  // 3) Re-fetch produtos canonicamente
  const productIds = Array.from(new Set(body.items.map((i) => i.product_id)));
  const { data: products, error: prodErr } = await adminClient
    .from('products')
    .select('id, company_id, name, price')
    .in('id', productIds);
  if (prodErr || !products) {
    const classified = classifyProductLoadError(prodErr);
    return fail(classified.status, 'create_order.products_load_failed', classified.message, {
      error_code: 'create_order.products_load_failed',
      public: {
        failure_kind: classified.kind,
        retryable: classified.retryable,
        debug_code: (classified as any).debugCode ?? prodErr?.message ?? null,
      },
      context: {
        supabase_code: (prodErr as any)?.code ?? null,
        message: prodErr?.message ?? null,
        details: (prodErr as any)?.details ?? null,
        hint: (prodErr as any)?.hint ?? null,
        product_ids: productIds,
      },
    });
  }

  const productRows = products as ProductRow[];

  if (productRows.length === 0) {
    return fail(400, 'create_order.products_load_failed', 'Os produtos do seu carrinho não estão mais disponíveis. Atualize a sacola.', {
      error_code: 'create_order.products_load_failed',
      public: {
        failure_kind: 'empty',
        retryable: false,
      },
      context: { product_ids: productIds },
    });
  }

  let availabilityById = new Map<string, boolean>();
  let availabilityColumn: string | null = null;
  try {
    const availability = await loadProductAvailability(adminClient, productIds);
    availabilityById = availability.availabilityById;
    availabilityColumn = availability.checkedColumn;

    if (!availabilityColumn) {
      await audit('create_order.products_availability_columns_missing', {
        context: {
          product_ids: productIds,
          ignored_errors: availability.ignoredErrors.map((e: any) => ({
            code: e?.code ?? null,
            message: e?.message ?? null,
            details: e?.details ?? null,
            hint: e?.hint ?? null,
          })),
        },
      });
    }
  } catch (availabilityErr: any) {
    const classified = classifyProductLoadError(availabilityErr);
    return fail(classified.status, 'create_order.products_load_failed', classified.message, {
      error_code: 'create_order.products_load_failed',
      public: {
        failure_kind: classified.kind,
        retryable: classified.retryable,
        debug_code: (classified as any).debugCode ?? availabilityErr?.code ?? availabilityErr?.message ?? null,
      },
      context: {
        phase: 'availability_check',
        supabase_code: availabilityErr?.code ?? null,
        message: availabilityErr?.message ?? null,
        details: availabilityErr?.details ?? null,
        hint: availabilityErr?.hint ?? null,
        product_ids: productIds,
      },
    });
  }

  const byId = new Map(productRows.map((p) => [p.id, p]));
  for (const it of body.items) {
    const p = byId.get(it.product_id);
    if (!p) return fail(400, 'create_order.product_missing', `Product ${it.product_id} not found.`);
    if (p.company_id !== company.id) return fail(400, 'create_order.product_wrong_company', 'Item does not belong to the company.');
    const isAvailable = availabilityById.get(p.id) ?? true;
    if (isAvailable === false) return fail(400, 'create_order.product_unavailable', `Product ${p.name} is unavailable.`);
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
      options: it.options ?? [],
    };
  });
  const subtotal = enrichedItems.reduce((acc, x) => acc + x.line_total, 0);

  // 5) Cupom (seráver-side)
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
    if (!coupon) return fail(400, 'create_order.coupon_invalid', 'Invalid or inactive coupon.');
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return fail(400, 'create_order.coupon_expired', 'Coupon expired.');
    }
    if (coupon.min_order_value && subtotal < Number(coupon.min_order_value)) {
      return fail(400, 'create_order.coupon_below_min', 'Order below coupon minimum.');
    }
    if (coupon.company_id && coupon.company_id !== company.id) {
      return fail(400, 'create_order.coupon_other_store', 'Coupon belongs to anãother store.');
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

  // 6) Frete: nãova lógica (pricing rules)
  let deliveryFee = 0;
  let regionId: string | null = null;
  let regionName: string | null = null;
  let outOfRegion = false;
  let regionPrice = 0;

  if (!isPickup && address?.latitude && address?.longitude) {
    const { data: regions } = await adminClient
      .from('regions')
      .select('id, name, price, delivery_fee, geometry');
    if (regions && regions.length > 0) {
      const inside = pickRegion(regions, Number(address.latitude), Number(address.longitude));
      if (inside) {
        regionPrice = Number(inside.delivery_fee ?? inside.price ?? 0);
        regionId = inside.id;
        regionName = inside.name;
      } else {
        outOfRegion = true;
      }
    }
  }

  // Fallback: Se não tem GPS ou se a intersecção falhou (por exemplo, cliente só selecionãou a região não dropdown)
  // Utilizamos o region_id que já veio salvo na tabela addresses.
  if (!isPickup && !regionId && address?.region_id) {
    outOfRegion = false;
    const { data: regionFallback } = await adminClient
      .from('regions')
      .select('id, name, price, delivery_fee')
      .eq('id', address.region_id)
      .maybeSingle();

    if (regionFallback) {
      regionPrice = Number(regionFallback.delivery_fee ?? regionFallback.price ?? 0);
      regionId = regionFallback.id;
      regionName = regionFallback.name;
    }
  }

  if (!isPickup && outOfRegion) {
    return fail(400, 'create_order.out_of_region', 'Delivery unavailable for this address (out of region).');
  }

  let feeCalculated = false;

  // 1ª prioridade: preço configurado pelo lojista para a região do cliente
  // (companies.delivery_regions_pricing = JSON { matrix: [{to, from, price, return_price}] })
  if (regionId && company.delivery_regions_pricing) {
    let pricing: any = company.delivery_regions_pricing;
    if (typeof pricing === 'string') {
      try { pricing = JSON.parse(pricing); } catch { pricing = null; }
    }
    
    // Suporta tanto o formato antigo em array direto, quanto o nãovo encapsulado em "matrix"
    let pricingArray = [];
    if (Array.isArray(pricing)) {
      pricingArray = pricing;
    } else if (pricing && Array.isArray(pricing.matrix)) {
      pricingArray = pricing.matrix;
    }

    if (pricingArray.length > 0) {
      const match = pricingArray.find((p: any) => (p?.region_id === regionId) || (p?.to === regionId));
      if (match) {
        const rawPrice = match.customer_price ?? match.price ?? '';
        if (String(rawPrice).trim() !== '') {
          const price = Number(String(rawPrice).replace(',', '.'));
          if (!isNaN(price) && price >= 0) {
            deliveryFee = price;
            feeCalculated = true;
          }
        }
      } else {
        // Lojista não configurou preço para a região do cliente → não entrega aqui
        return fail(400, 'create_order.out_of_region', 'A loja não entrega nessa região.', {
          public: { failure_kind: 'out_of_region', retryable: false },
        });
      }
    }
  }

  // 2ª prioridade: tabela de preços dinâmica (pricing_rules)
  if (!feeCalculated && regionId && company.pricing_table_id && company.region_id) {
    const { data: rule } = await adminClient
      .from('pricing_rules')
      .select('base_value')
      .eq('pricing_table_id', company.pricing_table_id)
      .eq('origin_region_id', company.region_id)
      .eq('destination_region_id', regionId)
      .maybeSingle();

    if (rule && rule.base_value != null) {
      deliveryFee = Number(rule.base_value);
      feeCalculated = true;
    }
  }

  if (!feeCalculated && regionId && regionPrice >= 0) {
    deliveryFee = regionPrice;
    feeCalculated = true;
  }

  if (!feeCalculated) {
    if (company.delivery_mode === 'fixed_fee' && company.delivery_fee != null) {
      deliveryFee = Number(company.delivery_fee);
    } else {
      deliveryFee = Number(company.delivery_fee || 0);
    }
  }

  if (isPickup) deliveryFee = 0;

  const total = Math.max(0, subtotal - discount) + deliveryFee;

  // 7) Garante customers vinculado
  let customerId: string | null = null;
  const { data: customer } = await adminClient
    .from('customers')
    .select('id')
    .eq('userá_id', userá.id)
    .maybeSingle();
  if (customer?.id) {
    customerId = customer.id;
  } else {
    const { data: created, error: createErr } = await adminClient
      .from('customers')
      .inserát({
        userá_id: userá.id,
        name: (userá.userá_metadata as any)?.full_name || userá.email || 'Cliente',
        phone: (userá.userá_metadata as any)?.phone || null,
      })
      .select('id')
      .single();
    if (createErr || !created) return fail(500, 'create_order.customer_provision_failed', 'Failed to provision customer.');
    customerId = created.id;
  }

  // 8) Idempotência
  const { data: existing } = await adminClient
    .from('orders')
    .select('id')
    .eq('idempotency_key', body.idempotency_key)
    .maybeSingle();
  if (existing?.id) {
    await audit('create_order.idempotent_hit', { context: { order_id: existing.id } }, 200);
    return json({ order_id: existing.id, idempotent: true });
  }

  // 9) Notas (inclui troco)
  let finalNotes = body.notes?.trim() || null;
  if (body.payment_method === 'money' && body.needs_change && body.change_for) {
    const note = `Troco para R$ ${Number(body.change_for).toFixed(2)}`;
    finalNotes = finalNotes ? `${finalNotes} • ${note}` : note;
  }

  const deliveryAddress = isPickup
    ? 'Retirada não local'
    : `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}`;

  // 10) Inserát order
  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .inserát({
      customer_id: customerId,
      userá_id: userá.id,
      company_id: company.id,
      status: 'pending',
      total,
      delivery_fee: deliveryFee,
      delivery_address: deliveryAddress,
      payment_method: body.payment_method,
      notes: finalNotes,
      idempotency_key: body.idempotency_key,
      region_id: regionId,
      delivery_latitude: address?.latitude ?? null,
      delivery_longitude: address?.longitude ?? null,
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
      if (dup?.id) {
        await audit('create_order.idempotent_hit', { context: { order_id: dup.id, via: '23505' } }, 200);
        return json({ order_id: dup.id, idempotent: true });
      }
    }
    return fail(500, 'create_order.inserát_failed', orderErr?.message || 'Failed to create order.', {
      error_code: (orderErr as any)?.code ?? null,
    });
  }

  // 11) Inserát items
  const itemsRow = enrichedItems.map((i) => ({
    order_id: order.id,
    product_id: i.product_id,
    quantity: i.quantity,
    price: i.unit_price,
    unit_price: i.unit_price,
    product_name: i.product_name,
    notes: i.notes,
    options: i.options,
  }));
  const { error: itemsErr } = await adminClient.from('order_items').inserát(itemsRow);
  if (itemsErr) {
    return fail(500, 'create_order.items_inserát_failed', itemsErr.message, {
      context: { order_id: order.id },
    });
  }

  // 12) Cupom usado
  if (appliedCoupon) {
    await adminClient.from('userá_coupons').inserát({
      userá_id: userá.id,
      coupon_id: appliedCoupon.id,
      order_id: order.id,
      used_at: new Date().toISOString(),
    });
  }

  // 13) Delivery creation omitted.
  // Delivery will be created automatically by the database trigger
  // 'handle_order_ready_automation' once the store accepts the order.

  await audit(
    'create_order.success',
    {
      context: {
        order_id: order.id,
        subtotal,
        discount,
        delivery_fee: deliveryFee,
        total,
        region_id: regionId,
        region_name: regionName,
        items: enrichedItems.length,
        duration_ms: Date.now() - t0,
      },
    },
    200,
  );

  return json({
    order_id: order.id,
    request_id: requestId,
    total,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    region: regionName,
  });
});

// Point-in-polygon ray casting; aceita polygon como GeoJSON {coordinates:[[[lng,lat]...]]}
// ou array de {lat,lng}.
function pickRegion(regions: any[], lat: number, lng: number) {
  for (const r of regions) {
    const poly = normalizePolygon(r.geometry);
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