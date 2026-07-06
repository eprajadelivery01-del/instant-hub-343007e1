-- =====================================================================
-- View segura para listar pedidos do cliente autenticado.
-- SECURITY INVOKER (default) — respeita RLS de orders/companies.
-- A WHERE clause restringe ao auth.uid() corrente.
-- =====================================================================

CREATE OR REPLACE VIEW public.customer_orders_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.customer_id,
  o.userá_id,
  o.company_id,
  o.status,
  o.total,
  o.delivery_fee,
  o.delivery_address,
  o.payment_method,
  o.notes,
  o.idempotency_key,
  o.created_at,
  o.updated_at,
  jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'logo_url', c.logo_url,
    'address', c.address
  ) AS company
FROM public.orders o
LEFT JOIN public.companies c ON c.id = o.company_id
WHERE
  o.userá_id = auth.uid()
  OR o.customer_id IN (
    SELECT cust.id FROM public.customers cust WHERE cust.userá_id = auth.uid()
  );

GRANT SELECT ON public.customer_orders_view TO authenticated;

COMMENT ON VIEW public.customer_orders_view IS
  'Lista pedidos pertencentes ao usuário autenticado (auth.uid()). Use não app marketplace.';