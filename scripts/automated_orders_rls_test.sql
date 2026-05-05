-- =====================================================================
-- Teste automatizado de RLS para public.orders
-- Roda no SQL Editor do Supabase. Exige que exista um usuário customer
-- já cadastrado em auth.users e public.customers.
--
-- Como usar:
--   1) defina o e-mail do cliente de teste em :test_email
--   2) rode o bloco inteiro
--   3) verifique a saída final (tabela results) — todos PASS
-- =====================================================================

\set test_email '\'cliente_teste@epraja.dev\''

DO $$
DECLARE
  v_uid uuid;
  v_customer_id uuid;
  v_company_id uuid;
  v_order_id uuid;
  v_select_count int;
  v_jwt jsonb;
  v_results jsonb := '[]'::jsonb;
  v_pass boolean;
  v_msg text;
BEGIN
  -- 1. Resolve o usuário de teste
  SELECT id INTO v_uid FROM auth.users WHERE email = :test_email LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário de teste % não existe em auth.users. Crie antes de rodar.', :test_email;
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE user_id = v_uid LIMIT 1;
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Faltando registro em public.customers para o user %', v_uid;
  END IF;

  SELECT id INTO v_company_id FROM public.companies LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa cadastrada — impossível testar.';
  END IF;

  -- 2. Simula o JWT do usuário autenticado para acionar RLS como anon role
  v_jwt := jsonb_build_object(
    'sub', v_uid::text,
    'role', 'authenticated',
    'email', :test_email
  );

  PERFORM set_config('request.jwt.claims', v_jwt::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- 3. Tenta INSERT como cliente
  BEGIN
    INSERT INTO public.orders (customer_id, user_id, company_id, status, total, delivery_fee, delivery_address, payment_method, idempotency_key)
    VALUES (v_customer_id, v_uid, v_company_id, 'pending', 1.00, 0, 'TEST-RLS', 'money', 'rls-test-' || gen_random_uuid())
    RETURNING id INTO v_order_id;
    v_results := v_results || jsonb_build_object('test', 'INSERT customer order', 'status', 'PASS', 'order_id', v_order_id);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_results := v_results || jsonb_build_object('test', 'INSERT customer order', 'status', 'FAIL', 'error', SQLERRM);
    PERFORM set_config('role', 'postgres', true);
    RAISE NOTICE 'Resultados: %', v_results;
    RETURN;
  END;

  -- 4. Tenta SELECT do próprio pedido recém-inserido
  SELECT count(*) INTO v_select_count FROM public.orders WHERE id = v_order_id;
  IF v_select_count = 1 THEN
    v_results := v_results || jsonb_build_object('test', 'SELECT own order', 'status', 'PASS');
  ELSE
    v_results := v_results || jsonb_build_object('test', 'SELECT own order', 'status', 'FAIL', 'count', v_select_count);
  END IF;

  -- 5. Tenta SELECT de pedido alheio (deve retornar 0)
  SELECT count(*) INTO v_select_count FROM public.orders WHERE id <> v_order_id LIMIT 1;
  IF v_select_count = 0 THEN
    v_results := v_results || jsonb_build_object('test', 'Cannot read other orders', 'status', 'PASS');
  ELSE
    v_results := v_results || jsonb_build_object('test', 'Cannot read other orders', 'status', 'FAIL', 'leaked', v_select_count);
  END IF;

  -- 6. Volta para superuser e limpa
  PERFORM set_config('role', 'postgres', true);
  DELETE FROM public.orders WHERE id = v_order_id;

  RAISE NOTICE '=== Resultado RLS test orders ===';
  RAISE NOTICE '%', jsonb_pretty(v_results);

  -- Falha o script se algum FAIL
  IF v_results::text ILIKE '%"status": "FAIL"%' THEN
    RAISE EXCEPTION 'RLS test falhou: %', v_results;
  END IF;
END $$;