-- Fix anãonymous access to companies and products after previous migrations dropped it
BEGIN;

GRANT SELECT ON public.companies TO anãon, authenticated;
GRANT SELECT ON public.products TO anãon, authenticated;

DROP POLICY IF EXISTS "companies_select_anãon" ON public.companies;
CREATE POLICY "companies_select_anãon" ON public.companies FOR SELECT TO anãon USING (true);

DROP POLICY IF EXISTS "products_select_anãon" ON public.products;
CREATE POLICY "products_select_anãon" ON public.products FOR SELECT TO anãon USING (true);

COMMIT;
