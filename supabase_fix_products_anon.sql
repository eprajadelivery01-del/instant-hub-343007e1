-- ======================================================================
-- SCRIPT DE CORREÇÃO: PERMISSÃO DE LEITURA PÚBLICA (ANÔNIMA) NA TABELA PRODUCTS
-- Motivo: Garantir que visitantes não autenticados possam ver produtos no app.
-- EXECUTE ESTE SCRIPT NO EDITOR SQL DO SUPABASE
-- ======================================================================

BEGIN;

-- 1. Garante permissões de leitura no PostgreSQL para papéis anon e authenticated
GRANT SELECT ON TABLE public.products TO anon, authenticated;

-- 2. Assegura que RLS está habilitado
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas anteriores de leitura que possam conflitar
DROP POLICY IF EXISTS "Permitir leitura publica dos produtos" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;

-- 4. Cria política permissiva de SELECT para visitantes anônimos e usuários autenticados
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

COMMIT;

-- 5. Recarrega o cache do Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';
