-- ==========================================================
-- SCRIPT DE REPARO NUCLEAR: NEXUSPRO FULL ECOSYSTEM (V6)
-- Este script garante a existência de TODAS as 14 tabelas do 
-- ecossistema para eliminar qualquer erro de schema.
-- ==========================================================

-- 1. EXTENSÕES E SCHEMAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ 
BEGIN
    -- 2. TABELAS DE SUPORTE (Cidades e Regiões)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'cities') THEN
        CREATE TABLE public.cities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL UNIQUE,
            latitude NUMERIC,
            longitude NUMERIC,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'regions') THEN
        CREATE TABLE public.regions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            city_id UUID REFERENCES public.cities(id),
            name TEXT NOT NULL,
            geometry JSONB,
            active BOOLEAN DEFAULT true,
            color TEXT,
            delivery_fee NUMERIC(10,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- 3. TABELAS DE USUÁRIOS E PERFIS
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
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'addresses') THEN
        CREATE TABLE public.addresses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            street TEXT NOT NULL,
            number TEXT NOT NULL,
            neighborhood TEXT,
            city TEXT,
            complement TEXT,
            reference TEXT,
            latitude NUMERIC,
            longitude NUMERIC,
            label TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- 4. TABELAS DE MARKETPLACE (Empresas e Produtos)
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
            city_id UUID REFERENCES public.cities(id),
            logo_url TEXT,
            banner_url TEXT,
            latitude NUMERIC,
            longitude NUMERIC,
            rating NUMERIC(3,2) DEFAULT 5.0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

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
    END IF;

    -- 5. TABELAS DE OPERAÇÃO (Pedidos e Entregas)
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

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'deliveries') THEN
        CREATE TABLE public.deliveries (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES public.orders(id),
            driver_id UUID REFERENCES auth.users(id),
            status TEXT DEFAULT 'pending',
            pickup_address TEXT,
            delivery_address TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- 6. TABELAS SOCIAIS E COMUNICAÇÃO
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'reviews') THEN
        CREATE TABLE public.reviews (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES public.orders(id),
            user_id UUID REFERENCES auth.users(id),
            company_id UUID REFERENCES public.companies(id),
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'chat_messages') THEN
        CREATE TABLE public.chat_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES auth.users(id),
            message TEXT,
            read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- 7. TABELAS DE SISTEMA
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'user_roles') THEN
        CREATE TABLE public.user_roles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 8. RLS HARDENING (TODAS AS TABELAS)
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

-- 9. RESET DE DADOS DE TESTE (NEXUSPRO.TEST)
DELETE FROM public.products WHERE company_id IN (SELECT id FROM public.companies WHERE email LIKE '%@nexuspro.test');
DELETE FROM public.companies WHERE email LIKE '%@nexuspro.test';
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@nexuspro.test');
DELETE FROM auth.users WHERE email LIKE '%@nexuspro.test';

-- 10. SEEDING (CLIENTE + 10 LOJAS)
DO $$ 
DECLARE 
    target_user_id UUID := gen_random_uuid();
    comp_user_id UUID;
    comp_id UUID;
    city_id UUID;
    i INTEGER;
    j INTEGER;
    store_names TEXT[] := ARRAY['Pizzaria Bella', 'Burguer Master', 'Sushi Premium', 'Padaria Central', 'Mercado Econômico', 'Farmácia Prática', 'Pet Shop Amigo', 'Shopping Center', 'Bebidas Direto', 'Gourmet Bistrô'];
    store_categories TEXT[] := ARRAY['Pizza', 'Lanches', 'Japonesa', 'Padaria', 'Mercado', 'Farmácia', 'Pet', 'Shopping', 'Bebidas', 'Doces'];
    product_names TEXT[] := ARRAY['Produto Premium', 'Oferta do Dia', 'Combo Especial', 'Item Clasico', 'Novidade', 'Seleção do Chef', 'Mais Vendido', 'Destaque', 'Especialidade', 'Sabor Único'];
BEGIN

    -- Garantir Cidade Diamantino
    INSERT INTO public.cities (name, latitude, longitude)
    VALUES ('Diamantino', -14.4087, -56.4462)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO city_id;

    -- 10.1 CLIENTE TESTE
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_super_admin)
    VALUES ('00000000-0000-0000-0000-000000000000', target_user_id, 'authenticated', 'authenticated', 'cliente@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Cliente Teste", "role":"customer"}'::jsonb, NOW(), NOW(), false);

    INSERT INTO public.profiles (id, full_name, role, phone)
    VALUES (target_user_id, 'Cliente Teste', 'customer', '11999999999')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    -- 10.2 10 LOJAS
    FOR i IN 1..10 LOOP
        comp_user_id := gen_random_uuid();
        comp_id := gen_random_uuid();
        
        -- Auth Usuário Loja
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000000', comp_user_id, 'authenticated', 'authenticated', 'loja' || i || '@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, ('{"full_name":"' || store_names[i] || '"}')::jsonb, NOW(), NOW());

        -- Perfil e Empresa
        INSERT INTO public.profiles (id, full_name, role) VALUES (comp_user_id, store_names[i], 'company');
        
        INSERT INTO public.companies (id, name, email, user_id, description, category, city, city_id, latitude, longitude, active)
        VALUES (comp_id, store_names[i], 'loja' || i || '@nexuspro.test', comp_user_id, 'Loja oficial NexusPro.', store_categories[i], 'Diamantino', city_id, -14.4087 + (random() * 0.01), -56.4462 + (random() * 0.01), true)
        ON CONFLICT (id) DO NOTHING;

        -- 10 Produtos
        FOR j IN 1..10 LOOP
            INSERT INTO public.products (company_id, name, price, description, category, active)
            VALUES (comp_id, product_names[j] || ' - ' || store_names[i], (random() * 40 + 10)::numeric(10,2), 'Descrição do ' || product_names[j], lower(store_categories[i]), true);
        END LOOP;
    END LOOP;

END $$;
