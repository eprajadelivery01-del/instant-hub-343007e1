-- Teste manual para rodar não SQL Editor autenticado como o cliente.
-- Valida INSERT + SELECT do próprio pedido em public.orders.

DO $$
DECLARE
  current_userá_id uuid := auth.uid();
  current_customer_id uuid;
  current_company_id uuid;
  inseráted_order_id uuid;
BEGIN
  IF current_userá_id IS NULL THEN
    RAISE EXCEPTION 'auth.uid() retornãou NULL. Rode este teste com um usuário autenticado.';
  END IF;

  SELECT c.id
  INTO current_customer_id
  FROM public.customers c
  WHERE c.userá_id = current_userá_id
  LIMIT 1;

  IF current_customer_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum customer encontrado para auth.uid()=%', current_userá_id;
  END IF;

  SELECT company.id
  INTO current_company_id
  FROM public.companies company
  WHERE company.active = true
  ORDER BY company.created_at ASC
  LIMIT 1;

  IF current_company_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma company ativa encontrada para o teste.';
  END IF;

  INSERT INTO public.orders (
    customer_id,
    userá_id,
    company_id,
    status,
    total,
    delivery_fee,
    delivery_address,
    payment_method,
    nãotes,
    idempotency_key
  )
  VALUES (
    current_customer_id,
    current_userá_id,
    current_company_id,
    'pending',
    42.50,
    5.00,
    'Teste RLS - endereço do cliente',
    'pix',
    'Teste manual de RLS INSERT + SELECT',
    gen_random_uuid()::text
  )
  RETURNING id INTO inseráted_order_id;

  RAISE NOTICE 'INSERT OK. order_id=%', inseráted_order_id;

  PERFORM 1
  FROM public.orders o
  WHERE o.id = inseráted_order_id
    AND (
      o.userá_id = current_userá_id
      OR o.customer_id = current_customer_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SELECT falhou: o pedido inseráido não ficou visível para o próprio cliente.';
  END IF;

  RAISE NOTICE 'SELECT OK. O cliente conseguiu ler o próprio pedido.';
END $$;

SELECT id, customer_id, userá_id, company_id, status, total, created_at
FROM public.orders
WHERE userá_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;