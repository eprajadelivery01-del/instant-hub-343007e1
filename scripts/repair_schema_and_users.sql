-- ==========================================================
-- SCRIPT DE REPARO: NEXUSPRO SCHEMA & USERS
-- Este script garante que a tabela 'profiles' tenha todas as colunas necessárias
-- e recria os usuários de teste com a configuração correta do Supabase.
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

-- 2. HABILITAR RLS E CRIAR POLÍTICAS DE ACESSO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. RE-CRIAR USUÁRIOS DE TESTE (LIMPAR ANTERIORES PARA EVITAR DUPLICATAS)
DELETE FROM auth.users WHERE email LIKE '%@nexuspro.test';

-- Função para criar usuário e perfil de uma vez
DO $$ 
DECLARE 
    temp_user_id UUID;
    i INTEGER;
    store_names TEXT[] := ARRAY['Pizzaria Bella', 'Burguer Master', 'Sushi Premium', 'Padaria Central', 'Mercado Econômico', 'Farmácia Prática', 'Pet Shop Amigo', 'Shopping Center', 'Bebidas Direto', 'Gourmet Bistrô'];
BEGIN

    -- 3.1 CLIENTE TESTE
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
        'cliente@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), 
        '{"provider":"email","providers":["email"]}', '{"full_name":"Cliente Teste"}', NOW(), NOW(), '', ''
    ) RETURNING id INTO temp_user_id;

    INSERT INTO public.profiles (id, full_name, role, phone)
    VALUES (temp_user_id, 'Cliente Teste', 'customer', '11999999999');


    -- 3.2 10 LOJISTAS
    FOR i IN 1..10 LOOP
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
            'loja' || i || '@nexuspro.test', crypt('Password123!', gen_salt('bf')), NOW(), 
            '{"provider":"email","providers":["email"]}', '{"full_name":"Lojista ' || i || '"}', NOW(), NOW(), '', ''
        ) RETURNING id INTO temp_user_id;

        INSERT INTO public.profiles (id, full_name, role, phone)
        VALUES (temp_user_id, 'Lojista ' || i, 'company', '1188888888' || i);

        INSERT INTO public.companies (id, name, email, active, user_id, description, phone, address, city)
        VALUES (
            gen_random_uuid(), store_names[i], 'loja' || i || '@nexuspro.test', true, 
            temp_user_id, 'Loja de teste BONASOFT.', '11888888' || i, 'Endereço de Teste #' || i, 'Diamantino'
        );
    END LOOP;

END $$;
