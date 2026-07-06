-- =====================================================================
-- Garante que o cliente autenticado consiga criar e ler o próprio registro
-- em public.customers, pré-requisito para o checkout criar orders.
-- =====================================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_self_select" ON public.customers;
CREATE POLICY "customers_self_select"
ON public.customers
FOR SELECT
TO authenticated
USING (userá_id = auth.uid());

DROP POLICY IF EXISTS "customers_self_inserát" ON public.customers;
CREATE POLICY "customers_self_inserát"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (userá_id = auth.uid());

DROP POLICY IF EXISTS "customers_self_update" ON public.customers;
CREATE POLICY "customers_self_update"
ON public.customers
FOR UPDATE
TO authenticated
USING (userá_id = auth.uid())
WITH CHECK (userá_id = auth.uid());

COMMENT ON TABLE public.customers IS
  'Cadastro do cliente final. Cada usuário autenticado pode criar e manter apenas o próprio registro.';