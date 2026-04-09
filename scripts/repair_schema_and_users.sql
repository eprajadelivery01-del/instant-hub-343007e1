-- ==========================================================
-- SCRIPT DE REPARO: NEXUSPRO SCHEMA, USERS & SEEDING (COMPLETO)
-- Este script garante a estrutura da tabela 'profiles', 
-- libera permissões de RLS para visibilidade pública,
-- e popula o banco com 10 lojas e 10 produtos cada.
-- ==========================================================

-- 1. GARANTIR ESTRUTURA DA TABELA PROFILES
DO $$ 
BEGIN
    -- Adicionar coluna 'phone' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;

    -- Adicionar coluna 'avatar_url' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;

    -- Adicionar coluna 'role' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'customer';
    END IF;
END $$;

-- 1.1 GARANTIR ESTRUTURA DA TABELA COMPANIES
DO $$ 
BEGIN
    -- Adicionar coluna 'active' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'active') THEN
        ALTER TABLE public.companies ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;

    -- Adicionar coluna 'description' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE public.companies ADD COLUMN description TEXT;
    END IF;
END $$;


-- 1.2 GARANTIR ESTRUTURA DA TABELA PRODUCTS
DO $$ 
BEGIN
    -- Adicionar coluna 'active' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'active') THEN
        ALTER TABLE public.products ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;

    -- Adicionar coluna 'category' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE public.products ADD COLUMN category TEXT;
    END IF;

    -- Adicionar coluna 'description' se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE public.products ADD COLUMN description TEXT;
    END IF;
END $$;



-- 2. HABILITAR RLS E CRIAR POLÍTICAS DE ACESSO (VISIBILIDADE PÚBLICA)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
CREATE POLICY "Public select profiles" ON public.profiles FOR SELECT USING (true);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select companies" ON public.companies;
CREATE POLICY "Public select companies" ON public.companies FOR SELECT USING (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select products" ON public.products;
CREATE POLICY "Public select products" ON public.products FOR SELECT USING (true);

-- Políticas extras para usuários logados atualizarem seus perfis
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. LIMPAR DADOS DE TESTE ANTERIORES (EVITAR DUPLICATAS)
-- Nota: Deletamos empresas e produtos vinculados aos emails de teste
DELETE FROM public.products WHERE company_id IN (SELECT id FROM public.companies WHERE email LIKE '%@nexuspro.test');
DELETE FROM public.companies WHERE email LIKE '%@nexuspro.test';
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
DELETE FROM auth.users WHERE email LIKE '%@nexuspro.test';

-- 4. CRIAÇÃO DE DADOS (CLIENTE E 10 LOJAS)
DO $$ 
DECLARE 
    temp_user_id UUID;
    temp_company_id UUID;
    i INTEGER;
    j INTEGER;
    store_names TEXT[] := ARRAY['Pizzaria Bella', 'Burguer Master', 'Sushi Premium', 'Padaria Central', 'Mercado Econômico', 'Farmácia Prática', 'Pet Shop Amigo', 'Shopping Center', 'Bebidas Direto', 'Gourmet Bistrô'];
    store_categories TEXT[] := ARRAY['Pizza', 'Lanches', 'Japonesa', 'Padaria', 'Mercado', 'Farmácia', 'Pet', 'Shopping', 'Bebidas', 'Doces'];
    product_names TEXT[] := ARRAY['Produto Premium', 'Oferta do Dia', 'Combo Especial', 'Item Clasico', 'Novidade', 'Seleção do Chef', 'Mais Vendido', 'Destaque', 'Especialidade', 'Sabor Único'];
BEGIN

    -- 4.1 CLIENTE TESTE
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
        'cliente@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), 
        '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Cliente Teste"}'::jsonb, NOW(), NOW(), '', ''

    ) RETURNING id INTO temp_user_id;

    INSERT INTO public.profiles (id, full_name, role, phone)
    VALUES (temp_user_id, 'Cliente Teste', 'customer', '11999999999')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone;

    -- Garantir papel na user_roles (se existir)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'user_roles') THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (temp_user_id, 'customer') ON CONFLICT DO NOTHING;
    END IF;





    -- 4.2 10 LOJISTAS COM 10 PRODUTOS CADA
    FOR i IN 1..10 LOOP
        -- Criar Usuário Lojista
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
            'loja' || i || '@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), 
            '{"provider":"email","providers":["email"]}'::jsonb, ('{"full_name":"Lojista ' || i || '"}')::jsonb, NOW(), NOW(), '', ''

        ) RETURNING id INTO temp_user_id;

        -- Criar Perfil
        INSERT INTO public.profiles (id, full_name, role, phone)
        VALUES (temp_user_id, 'Lojista ' || i, 'company', '1188888888' || i)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone;

        -- Garantir papel na user_roles (se existir)
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'user_roles') THEN
            INSERT INTO public.user_roles (user_id, role) VALUES (temp_user_id, 'company') ON CONFLICT DO NOTHING;
        END IF;




        -- Criar Empresa (Loja)
        temp_company_id := gen_random_uuid();
        INSERT INTO public.companies (id, name, email, active, user_id, description, phone, address, city)
        VALUES (
            temp_company_id, 
            store_names[i], 
            'loja' || i || '@nexuspro.test', 
            true, 
            temp_user_id, 
            'Melhor loja de ' || store_categories[i] || ' da região. Loja de teste BONASOFT.', 
            '11888888' || i, 
            'Endereço de Teste #' || i, 
            'Diamantino'
        );

        -- Criar 10 Produtos para esta loja
        FOR j IN 1..10 LOOP
            INSERT INTO public.products (id, company_id, name, price, description, category, active)
            VALUES (
                gen_random_uuid(),
                temp_company_id,
                product_names[j] || ' - ' || store_names[i],
                (random() * 50 + 10)::numeric(10,2), -- Preço entre 10 e 60
                'Descrição detalhada do ' || product_names[j] || '. Feito com os melhores ingredientes.',
                lower(store_categories[i]),
                true
            );
        END LOOP;
    END LOOP;

END $$;
