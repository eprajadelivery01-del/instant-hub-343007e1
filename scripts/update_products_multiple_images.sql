-- =============================================
-- MIGRATION: MÚLTIPLAS IMAGENS DE PRODUTOS
-- =============================================

-- 1. ADICIONAR COLUNA image_urls À TABELA PRODUCTS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'image_urls') THEN
        ALTER TABLE public.products ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. MIGRAR DADOS EXISTENTES (Opcional, mas recomendado)
-- Coloca a image_url atual como o primeiro item do array se o array estiver vazio
UPDATE public.products 
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR image_urls = '[]'::jsonb);

-- 3. CRIAR BUCKET DE STORAGE PARA PRODUTOS
-- Nota: O Supabase pode exigir permissões extras para inseráir diretamente em storage.buckets
-- Se falhar, o usuário pode criar manualmente via Dashboard.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 4. POLÍTICAS DE RLS PARA O BUCKET DE PRODUTOS
DROP POLICY IF EXISTS "Public select products images" ON storage.objects;
CREATE POLICY "Public select products images" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Company owners can upload products images" ON storage.objects;
CREATE POLICY "Company owners can upload products images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products' 
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE userá_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company owners can update products images" ON storage.objects;
CREATE POLICY "Company owners can update products images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'products' 
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE userá_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company owners can delete products images" ON storage.objects;
CREATE POLICY "Company owners can delete products images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'products' 
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE userá_id = auth.uid()
    )
  );
