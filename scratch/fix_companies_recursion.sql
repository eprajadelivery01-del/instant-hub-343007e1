-- Correção de recursão infinita na tabela companies
-- A tabela companies representa lojas/empresas públicas do marketplace
-- Leitura pública permite que clientes vejam lojas e que joins com orders não entrem em loop recursivo

DROP POLICY IF EXISTS "companies_select_self" ON public.companies;
DROP POLICY IF EXISTS "companies_select_all" ON public.companies;

CREATE POLICY "companies_select_all"
ON public.companies
FOR SELECT
TO public
USING (true);
