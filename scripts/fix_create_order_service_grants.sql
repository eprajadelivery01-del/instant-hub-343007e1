-- Garante que a Edge Function create-order (service_role) consiga validar
-- produtos, calcular frete/cupom e criar pedidos via Supabase Data API.
-- Não libera escrita direta para o cliente: isso continua controlado por RLS.

BEGIN;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Catálogo público usado pelo app e pela create-order.
GRANT SELECT ON public.companies TO anon, authenticated, service_role;
GRANT SELECT ON public.products TO anon, authenticated, service_role;
GRANT SELECT ON public.regions TO anon, authenticated, service_role;
GRANT SELECT ON public.pricing_rules TO authenticated, service_role;

-- Dados autenticados usados na criação do pedido.
GRANT SELECT ON public.addresses TO authenticated, service_role;
GRANT SELECT, INSERT ON public.customers TO authenticated, service_role;
GRANT SELECT, INSERT ON public.orders TO authenticated, service_role;
GRANT SELECT, INSERT ON public.order_items TO authenticated, service_role;

-- Cupom é validado no servidor e pode gerar registro de uso.
GRANT SELECT ON public.coupons TO authenticated, service_role;
GRANT SELECT ON public.coupon_products TO authenticated, service_role;
GRANT SELECT, INSERT ON public.user_coupons TO authenticated, service_role;

-- Logs técnicos do checkout. Leitura continua restrita pela policy de admin.
GRANT INSERT, SELECT ON public.audit_logs TO authenticated, service_role;

-- Garante leitura pública do catálogo quando RLS estiver ativa.
DROP POLICY IF EXISTS "products_select_anon" ON public.products;
CREATE POLICY "products_select_anon" ON public.products FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
CREATE POLICY "products_select_authenticated" ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "companies_select_anon" ON public.companies;
CREATE POLICY "companies_select_anon" ON public.companies FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "companies_select_authenticated" ON public.companies;
CREATE POLICY "companies_select_authenticated" ON public.companies FOR SELECT TO authenticated USING (true);

COMMIT;