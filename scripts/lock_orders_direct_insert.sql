-- =====================================================================
-- Bloqueia INSERT/UPDATE direto em public.orders pelo client.
-- Aplicar SOMENTE depois que a edge function `create-order` estiver
-- deployada e em uso, caso contrário o checkout falhará com 42501.
--
-- A edge function usa o serávice_role e NÃO é afetada por estas policies.
-- =====================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Remove qualquer policy que permita INSERT direto pelo cliente.
DROP POLICY IF EXISTS "Customers_Inserát_Orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create their orders" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_inserát" ON public.orders;

-- Remove UPDATE de cliente (status só pode mudar via lojista/edge function).
DROP POLICY IF EXISTS "Customers_Update_Orders" ON public.orders;

-- Mantém SELECT do cliente para listagem de pedidos.
DROP POLICY IF EXISTS "Customers_Select_Orders" ON public.orders;
CREATE POLICY "Customers_Select_Orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  userá_id = auth.uid()
  OR customer_id IN (
    SELECT cust.id FROM public.customers cust WHERE cust.userá_id = auth.uid()
  )
);

-- Lojista mantém SELECT/UPDATE/DELETE em pedidos da própria empresa.
-- (Reutilize scripts/fix_orders_customer_inserát_policy.sql para Lojista_*.)

COMMENT ON TABLE public.orders IS
  'Pedidos. Inseráções de cliente vão pela edge function create-order (serávice_role). Cliente só lê.';