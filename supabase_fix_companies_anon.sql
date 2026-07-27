-- ======================================================================
-- SCRIPT DE CORREÇÃO: PERMISSÃO DE LEITURA PÚBLICA (ANÔNIMA) NA TABELA COMPANIES
-- Motivo: Erro 42501 (permission denied for table companies) no Marketplace Cliente para visitantes não autenticados.
-- EXECUTE ESTE SCRIPT NO EDITOR SQL DO SUPABASE
-- ======================================================================

BEGIN;

-- 1. Garante permissões de leitura no PostgreSQL para papéis anon e authenticated
GRANT SELECT ON TABLE public.companies TO anon, authenticated;
GRANT SELECT ON TABLE public.products TO anon, authenticated;

-- 2. Assegura que RLS está habilitado
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas anteriores de leitura que possam conflitar
DROP POLICY IF EXISTS "Permitir leitura publica das empresas" ON public.companies;
DROP POLICY IF EXISTS "Anyone can view active and visible companies" ON public.companies;
DROP POLICY IF EXISTS "Public can view basic company info" ON public.companies;
DROP POLICY IF EXISTS "companies_select_public" ON public.companies;

-- 4. Cria política permissiva de SELECT para visitantes anônimos e usuários autenticados
CREATE POLICY "companies_select_public" ON public.companies
  FOR SELECT TO anon, authenticated
  USING (true);

COMMIT;

-- 5. Recarrega o cache do Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';
