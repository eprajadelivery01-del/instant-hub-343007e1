-- ==========================================================
-- SCRIPT DE REPARO COMPLETO: NEXUSPRO SCHEMA & AUTH (V5 SUPREME)
-- Este script garante que TODAS as tabelas esperadas pelo 
-- aplicativo Cliente existam com a estrutura correta.
-- ==========================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. GARANTIR ESTRUTURA DAS TABELAS CORE
DO $$ 
BEGIN
    -- PROFILES
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            avatar_url TEXT,
            phone TEXT,
            role TEXT DEFAULT 'customer',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Garantir colunas se a tabela existia incompleta
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'phone') THEN ALTER TABLE public.profiles ADD COLUMN phone TEXT; END IF;
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'role') THEN ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'customer'; END IF;
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'created_at') THEN ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); END IF;
    END IF;

    -- COMPANIES
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'companies') THEN
        CREATE TABLE public.companies (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            email TEXT,
            active BOOLEAN DEFAULT true,
            user_id UUID REFERENCES auth.users(id),
            description TEXT,
            category TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            logo_url TEXT,
            banner_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'banner_url') THEN ALTER TABLE public.companies ADD COLUMN banner_url TEXT; END IF;
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'description') THEN ALTER TABLE public.companies ADD COLUMN description TEXT; END IF;
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'category') THEN ALTER TABLE public.companies ADD COLUMN category TEXT; END IF;
    END IF;

    -- PRODUCTS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'products') THEN
        CREATE TABLE public.products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            price NUMERIC(10,2) DEFAULT 0,
            description TEXT,
            category TEXT,
            image_url TEXT,
            image_urls JSONB DEFAULT '[]'::jsonb,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'image_urls') THEN ALTER TABLE public.products ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb; END IF;
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'category') THEN ALTER TABLE public.products ADD COLUMN category TEXT; END IF;
    END IF;

    -- ORDERS (TABELA CRÍTICA PARA O CLIENTE)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'orders') THEN
        CREATE TABLE public.orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_id UUID REFERENCES auth.users(id),
            company_id UUID REFERENCES public.companies(id),
            status TEXT DEFAULT 'pending',
            total NUMERIC(10,2) DEFAULT 0,
            delivery_fee NUMERIC(10,2) DEFAULT 0,
            delivery_address TEXT,
            payment_method TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- ORDER_ITEMS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'order_items') THEN
        CREATE TABLE public.order_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
            product_id UUID REFERENCES public.products(id),
            quantity INTEGER DEFAULT 1,
            price NUMERIC(10,2),
            product_name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- USER_ROLES (OPCIONAL)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'user_roles') THEN
        CREATE TABLE public.user_roles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 3. HABILITAR RLS E CONFIGURAR VISIBILIDADE PÚBLICA
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
CREATE POLICY "Public select profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select companies" ON public.companies;
CREATE POLICY "Public select companies" ON public.companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select products" ON public.products;
CREATE POLICY "Public select products" ON public.products FOR SELECT USING (true);

-- Política para usuários verem apenas seus próprios pedidos
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);

-- 4. LIMPAR DADOS DE TESTE E REBOOT DOS USUÁRIOS
-- Limpeza estratégica para evitar erros de FK
DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test'));
DELETE FROM public.orders WHERE customer_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
DELETE FROM public.products WHERE company_id IN (SELECT id FROM public.companies WHERE email LIKE '%@nexuspro.test');
DELETE FROM public.companies WHERE email LIKE '%@nexuspro.test';
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
DELETE FROM auth.users WHERE email LIKE '%@nexuspro.test';

-- 5. CRIAÇÃO DO CLIENTE TESTE (FORMATO SUPABASE GO TRUE)
DO $$ 
DECLARE 
    target_user_id UUID := gen_random_uuid();
    comp_user_id UUID;
    comp_id UUID;
    i INTEGER;
    j INTEGER;
    store_names TEXT[] := ARRAY['Pizzaria Bella', 'Burguer Master', 'Sushi Premium', 'Padaria Central', 'Mercado Econômico', 'Farmácia Prática', 'Pet Shop Amigo', 'Shopping Center', 'Bebidas Direto', 'Gourmet Bistrô'];
    store_categories TEXT[] := ARRAY['Pizza', 'Lanches', 'Japonesa', 'Padaria', 'Mercado', 'Farmácia', 'Pet', 'Shopping', 'Bebidas', 'Doces'];
    product_names TEXT[] := ARRAY['Produto Premium', 'Oferta do Dia', 'Combo Especial', 'Item Clasico', 'Novidade', 'Seleção do Chef', 'Mais Vendido', 'Destaque', 'Especialidade', 'Sabor Único'];
BEGIN

    -- 5.1 INSERIR CLIENTE EM AUTH.USERS
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, is_super_admin, phone
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000', target_user_id, 'authenticated', 'authenticated', 
        'cliente@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), 
        '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Cliente Teste", "role":"customer"}'::jsonb, NOW(), NOW(), '', '', false, '11999999999'
    );

    -- 5.2 INSERIR PERFIL PÚBLICO (UPSERT)
    INSERT INTO public.profiles (id, full_name, role, phone)
    VALUES (target_user_id, 'Cliente Teste', 'customer', '11999999999')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone;

    -- 5.3 10 LOJISTAS E PRODUTOS
    FOR i IN 1..10 LOOP
        comp_user_id := gen_random_uuid();
        
        -- Auth Usuário Loja
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000000', comp_user_id, 'authenticated', 'authenticated', 'loja' || i || '@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, ('{"full_name":"' || store_names[i] || '"}')::jsonb, NOW(), NOW());

        -- Perfil Loja (UPSERT)
        INSERT INTO public.profiles (id, full_name, role, phone)
        VALUES (comp_user_id, store_names[i], 'company', '118888888' || i)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone;

        -- Tabela Companies (UPSERT)
        comp_id := gen_random_uuid();
        INSERT INTO public.companies (id, name, email, active, user_id, description, phone, address, city, category)
        VALUES (comp_id, store_names[i], 'loja' || i || '@nexuspro.test', true, comp_user_id, 'Melhor loja de ' || store_categories[i] || ' da região.', '11888888' || i, 'Endereço #' || i, 'Diamantino', store_categories[i])
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            active = EXCLUDED.active,
            user_id = EXCLUDED.user_id,
            description = EXCLUDED.description,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            category = EXCLUDED.category;

        -- 10 Produtos por Loja
        FOR j IN 1..10 LOOP
            INSERT INTO public.products (company_id, name, price, description, category, active)
            VALUES (comp_id, product_names[j] || ' - ' || store_names[i], (random() * 40 + 10)::numeric(10,2), 'Descrição do ' || product_names[j], lower(store_categories[i]), true);
        END LOOP;
    END LOOP;

END $$;
