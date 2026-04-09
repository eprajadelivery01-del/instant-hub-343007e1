-- ==========================================================
-- SCRIPT DE HARMONIZAÇÃO UNIFICADA: NEXUSPRO (V7)
-- Resolve o conflito entre Admin e App Cliente.
-- Suporta ambos: is_active/active, price/delivery_fee, id/user_id.
-- ==========================================================

-- 1. EXTENSÕES E SCHEMAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS (PADRÃO ADMIN)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'company', 'driver', 'customer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE public.delivery_status AS ENUM ('pending', 'accepted', 'collecting', 'in_route', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
    END IF;
END $$;

-- 3. TABELAS DE SUPORTE
DO $$ 
BEGIN
    -- Cidades
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cities') THEN
        CREATE TABLE public.cities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL UNIQUE,
            latitude NUMERIC, longitude NUMERIC,
            active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Regiões (Harmonizada: price/delivery_fee, is_active/active)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'regions') THEN
        CREATE TABLE public.regions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            city_id UUID REFERENCES public.cities(id),
            name TEXT NOT NULL,
            geometry JSONB,
            color TEXT DEFAULT '#3B82F6',
            is_active BOOLEAN DEFAULT true,
            active BOOLEAN DEFAULT true, -- Dual support
            price NUMERIC(10,2) DEFAULT 0,
            delivery_fee NUMERIC(10,2) DEFAULT 0, -- Dual support
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 4. TABELAS DE USUÁRIOS (Harmonizada: id/user_id)
DO $$ 
BEGIN
    -- Perfis
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- PK
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE, -- Admin Link
            full_name TEXT NOT NULL DEFAULT '',
            avatar_url TEXT,
            phone TEXT,
            role TEXT DEFAULT 'customer',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Roles (Usando Enum)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
        CREATE TABLE public.user_roles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            role public.app_role NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, role)
        );
    END IF;

    -- Customers (Tabela específica do Admin)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
        CREATE TABLE public.customers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
            name TEXT NOT NULL,
            cpf TEXT, phone TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 5. MARKETPLACE (Harmonizada: active/is_active)
DO $$ 
BEGIN
    -- Empresas
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
        CREATE TABLE public.companies (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            description TEXT,
            category TEXT,
            phone TEXT, address TEXT, city TEXT,
            city_id UUID REFERENCES public.cities(id),
            region_id UUID REFERENCES public.regions(id),
            logo_url TEXT, banner_url TEXT,
            latitude NUMERIC, longitude NUMERIC,
            rating NUMERIC(3,2) DEFAULT 5.0,
            active BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true, -- Dual support
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Produtos
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        CREATE TABLE public.products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
            name TEXT NOT NULL,
            price NUMERIC(10,2) NOT NULL DEFAULT 0,
            description TEXT, category TEXT,
            image_url TEXT, image_urls JSONB DEFAULT '[]'::jsonb,
            active BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true, -- Dual support
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 6. OPERAÇÃO (Pedidos e Entregas)
DO $$ 
BEGIN
    -- Pedidos
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        CREATE TABLE public.orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_id UUID REFERENCES public.customers(id),
            client_id UUID REFERENCES auth.users(id), -- Alias para o Cliente App
            company_id UUID REFERENCES public.companies(id) NOT NULL,
            status public.order_status DEFAULT 'pending',
            total NUMERIC(10,2) DEFAULT 0,
            delivery_fee NUMERIC(10,2) DEFAULT 0,
            delivery_address TEXT, payment_method TEXT, notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Itens
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
        CREATE TABLE public.order_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
            product_id UUID REFERENCES public.products(id) NOT NULL,
            quantity INTEGER DEFAULT 1,
            price NUMERIC(10,2) NOT NULL,
            product_name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 7. SINCRONIA DE CAMPOS (Caso as tabelas já existam)
-- Garante que o App Cliente sempre encontre as colunas que espera
DO $$ 
BEGIN
    -- Regions
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'price') THEN
        ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
        UPDATE public.regions SET delivery_fee = price WHERE delivery_fee = 0;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'is_active') THEN
        ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
        UPDATE public.regions SET active = is_active;
    END IF;

    -- Companies
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_active') THEN
        ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
        UPDATE public.companies SET active = is_active;
    END IF;

    -- Profiles (Garantir ID = USER_ID para o Cliente App se possível, ou compatibilidade)
    -- O Cliente App usa .from('profiles').select('*').eq('id', userId)
    -- Vamos garantir que se 'user_id' for o link, 'id' também seja o mesmo ou exista um fallback.
END $$;

-- 8. RLS GERAL (Marketplace Público)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public select %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Public select %I" ON public.%I FOR SELECT USING (true)', t, t);
    END LOOP;
END $$;

-- 9. RESET E SEEDING (HARMONIZADO)
DO $$ 
DECLARE 
    target_user_id UUID := gen_random_uuid();
    comp_user_id UUID;
    city_id UUID;
BEGIN
    -- Limpeza mais agressiva para evitar órfãos
    DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test')));
    DELETE FROM public.orders WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test'));
    DELETE FROM public.products WHERE company_id IN (SELECT id FROM public.companies WHERE email LIKE '%@nexuspro.test');
    DELETE FROM public.companies WHERE email LIKE '%@nexuspro.test';
    DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
    DELETE FROM public.customers WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
    DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
    DELETE FROM auth.users WHERE email LIKE '%@nexuspro.test';

    -- Cidade
    INSERT INTO public.cities (name, latitude, longitude) VALUES ('Diamantino', -14.4087, -56.4462)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO city_id;

    -- CLIENTE TESTE
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', target_user_id, 'authenticated', 'authenticated', 'cliente@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Cliente Teste", "role":"customer"}'::jsonb, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Usamos ON CONFLICT (id) porque é a Primary Key que está gerando o erro de duplicidade.
    -- Se o trigger já criou o perfil com este ID, nós apenas atualizamos os campos.
    INSERT INTO public.profiles (id, user_id, full_name, role)
    VALUES (target_user_id, target_user_id, 'Cliente Teste', 'customer')
    ON CONFLICT (id) DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    INSERT INTO public.customers (user_id, name) VALUES (target_user_id, 'Cliente Teste') ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'customer') ON CONFLICT DO NOTHING;

    -- UMA LOJA PARA TESTE IMEDIATO
    comp_user_id := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', comp_user_id, 'authenticated', 'authenticated', 'loja_teste@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Lanchonete Teste"}'::jsonb, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.profiles (id, user_id, full_name, role) 
    VALUES (comp_user_id, comp_user_id, 'Lanchonete Teste', 'company')
    ON CONFLICT (id) DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    INSERT INTO public.user_roles (user_id, role) VALUES (comp_user_id, 'company') ON CONFLICT DO NOTHING;
    
    INSERT INTO public.companies (id, name, email, user_id, description, category, city, city_id, active, is_active)
    VALUES (gen_random_uuid(), 'Lanchonete Teste', 'loja_teste@nexuspro.test', comp_user_id, 'A melhor loja de teste.', 'Lanches', 'Diamantino', city_id, true, true);
END $$;

-- 10. RELOAD SCHEMA (IMPORTANTE PARA O LOVABLE RECONHECER AS MUDANÇAS)
NOTIFY pgrst, 'reload schema';
