-- Garante que a Edge Function create-order (service_role) consiga validar
-- produtos, calcular frete/cupom e criar pedidos via Supabase Data API.
-- Não libera escrita direta para o cliente: isso continua controlado por RLS.

BEGIN;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

DO $$
BEGIN
  -- Catálogo público usado pelo app e pela create-order.
  IF to_regclass('public.companies') IS NOT NULL THEN
    GRANT SELECT ON public.companies TO anon, authenticated, service_role;
    DROP POLICY IF EXISTS "companies_select_anon" ON public.companies;
    CREATE POLICY "companies_select_anon" ON public.companies FOR SELECT TO anon USING (true);
    DROP POLICY IF EXISTS "companies_select_authenticated" ON public.companies;
    CREATE POLICY "companies_select_authenticated" ON public.companies FOR SELECT TO authenticated USING (true);
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    GRANT SELECT ON public.products TO anon, authenticated, service_role;
    DROP POLICY IF EXISTS "products_select_anon" ON public.products;
    CREATE POLICY "products_select_anon" ON public.products FOR SELECT TO anon USING (true);
    DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
    CREATE POLICY "products_select_authenticated" ON public.products FOR SELECT TO authenticated USING (true);
  END IF;

  IF to_regclass('public.regions') IS NOT NULL THEN
    GRANT SELECT ON public.regions TO anon, authenticated, service_role;
  END IF;

  IF to_regclass('public.pricing_rules') IS NOT NULL THEN
    GRANT SELECT ON public.pricing_rules TO authenticated, service_role;
  END IF;

  -- Dados autenticados usados na criação do pedido.
  IF to_regclass('public.addresses') IS NOT NULL THEN
    GRANT SELECT ON public.addresses TO authenticated, service_role;
  END IF;

  IF to_regclass('public.customers') IS NOT NULL THEN
    GRANT SELECT ON public.customers TO authenticated;
    GRANT SELECT, INSERT ON public.customers TO service_role;
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    GRANT SELECT ON public.orders TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
  END IF;

  IF to_regclass('public.order_items') IS NOT NULL THEN
    GRANT SELECT ON public.order_items TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;
  END IF;

  -- Cupom é validado no servidor e pode gerar registro de uso.
  IF to_regclass('public.coupons') IS NOT NULL THEN
    GRANT SELECT ON public.coupons TO authenticated, service_role;
  END IF;

  IF to_regclass('public.coupon_products') IS NOT NULL THEN
    GRANT SELECT ON public.coupon_products TO authenticated, service_role;
  END IF;

  IF to_regclass('public.user_coupons') IS NOT NULL THEN
    GRANT SELECT ON public.user_coupons TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_coupons TO service_role;
  END IF;

  -- Logs técnicos do checkout. Leitura continua restrita pela policy de admin.
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    GRANT INSERT, SELECT ON public.audit_logs TO authenticated, service_role;
  END IF;
END $$;

COMMIT;