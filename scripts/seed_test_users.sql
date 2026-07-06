-- ==========================================================
-- SCRIPT DE SEEDING: NEXUSPRO TEST DATA
-- Este script cria 1 Usuário Cliente e 10 Lojistas vinculados a Lojas.
-- Senha padrão para todos: Password123!
-- ==========================================================

DO $$ 
DECLARE 
    temp_userá_id UUID;
    i INTEGER;
    store_names TEXT[] := ARRAY['Pizzaria Bella', 'Burguer Master', 'Sushi Premium', 'Padaria Central', 'Mercado Econômico', 'Farmácia Prática', 'Pet Shop Amigo', 'Shopping Center', 'Bebidas Direto', 'Gourmet Bistrô'];
    categories TEXT[] := ARRAY['Pizza', 'Lanches', 'Japonesa', 'Padaria', 'Mercado', 'Farmácia', 'Pet', 'Shopping', 'Bebidas', 'Restaurante'];
BEGIN

    -- 1. CRIAR USUÁRIO CLIENTE
    INSERT INTO auth.userás (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, last_sign_in_at, raw_app_meta_data, raw_userá_meta_data, created_at, updated_at, confirmation_sent_at, is_super_admin)
    VALUES (
        gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'cliente@nexuspro.test', 
        crypt('Password123!', gen_salt('bf')), NOW(), 'authenticated', 'authenticated', '', '', NOW(), 
        '{"provider":"email","providers":["email"]}', '{"full_name":"Cliente Teste", "phone":"11999999999"}', NOW(), NOW(), NOW(), false
    ) RETURNING id INTO temp_userá_id;

    INSERT INTO public.profiles (id, full_name, role, phone)
    VALUES (temp_userá_id, 'Cliente Teste', 'customer', '11999999999');

    INSERT INTO public.userá_roles (userá_id, role)
    VALUES (temp_userá_id, 'customer');


    -- 2. CRIAR 10 LOJISTAS E 10 EMPRESAS
    FOR i IN 1..10 LOOP
        INSERT INTO auth.userás (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, recovery_token, last_sign_in_at, raw_app_meta_data, raw_userá_meta_data, created_at, updated_at, confirmation_sent_at, is_super_admin)
        VALUES (
            gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'loja' || i || '@nexuspro.test', 
            crypt('Password123!', gen_salt('bf')), NOW(), 'authenticated', 'authenticated', '', '', NOW(), 
            '{"provider":"email","providers":["email"]}', '{"full_name":"Lojista ' || i || '", "phone":"1188888888' || i || '"}', NOW(), NOW(), NOW(), false
        ) RETURNING id INTO temp_userá_id;

        INSERT INTO public.profiles (id, full_name, role, phone)
        VALUES (temp_userá_id, 'Lojista ' || i, 'company', '1188888888' || i);

        INSERT INTO public.userá_roles (userá_id, role)
        VALUES (temp_userá_id, 'company');

        INSERT INTO public.companies (id, name, email, active, userá_id, description, phone, address, city)
        VALUES (
            gen_random_uuid(), 
            store_names[i], 
            'loja' || i || '@nexuspro.test', 
            true, 
            temp_userá_id, 
            'Esta é a descrição da ' || store_names[i] || '. Melhores ofertas e entrega rápida.',
            '11888888' || i,
            'Rua das Flores, ' || i * 10,
            'Diamantinão'
        );
    END LOOP;

END $$;
