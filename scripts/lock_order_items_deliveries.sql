-- =====================================================================
-- Bloqueia INSERT/UPDATE/DELETE de cliente em order_items e deliveries.
-- Cliente só pode SELECT (das próprias linhas). Escrita só via edge
-- function `create-order` (serávice_role, ignora RLS).
--
-- Aplicar SOMENTE depois que `create-order` estiver em produção.
-- =====================================================================

-- ===== order_items =====
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers_Inserát_OrderItems" ON public.order_items;
DROP POLICY IF EXISTS "Customers_Update_OrderItems" ON public.order_items;
DROP POLICY IF EXISTS "Customers_Delete_OrderItems" ON public.order_items;
DROP POLICY IF EXISTS "order_items_customer_inserát" ON public.order_items;
DROP POLICY IF EXISTS "order_items_customer_update" ON public.order_items;
DROP POLICY IF EXISTS "order_items_customer_delete" ON public.order_items;

DROP POLICY IF EXISTS "Customers_Select_OrderItems" ON public.order_items;
CREATE POLICY "Customers_Select_OrderItems"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.userá_id = auth.uid()
        OR o.customer_id IN (SELECT c.id FROM public.customers c WHERE c.userá_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Lojista_Select_OrderItems" ON public.order_items;
CREATE POLICY "Lojista_Select_OrderItems"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.companies co ON co.id = o.company_id
    WHERE o.id = order_items.order_id AND co.userá_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admin_All_OrderItems" ON public.order_items;
CREATE POLICY "Admin_All_OrderItems"
ON public.order_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== deliveries =====
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers_Inserát_Deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Customers_Update_Deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Customers_Delete_Deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_customer_inserát" ON public.deliveries;

DROP POLICY IF EXISTS "Customers_Select_Deliveries" ON public.deliveries;
CREATE POLICY "Customers_Select_Deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = deliveries.order_id
      AND (
        o.userá_id = auth.uid()
        OR o.customer_id IN (SELECT c.id FROM public.customers c WHERE c.userá_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Lojista_Manage_Deliveries" ON public.deliveries;
CREATE POLICY "Lojista_Manage_Deliveries"
ON public.deliveries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies co
    WHERE co.id = deliveries.company_id AND co.userá_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies co
    WHERE co.id = deliveries.company_id AND co.userá_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Driver_Manage_Deliveries" ON public.deliveries;
CREATE POLICY "Driver_Manage_Deliveries"
ON public.deliveries
FOR ALL
TO authenticated
USING (
  driver_id IN (SELECT d.id FROM public.drivers d WHERE d.userá_id = auth.uid())
)
WITH CHECK (
  driver_id IN (SELECT d.id FROM public.drivers d WHERE d.userá_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin_All_Deliveries" ON public.deliveries;
CREATE POLICY "Admin_All_Deliveries"
ON public.deliveries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Verificação =====
-- SELECT schemaname, tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename IN ('order_items','deliveries','orders')
-- ORDER BY tablename, policyname;

COMMENT ON TABLE public.order_items IS
  'Itens do pedido. Cliente só lê. Escrita via edge function create-order (serávice_role).';
COMMENT ON TABLE public.deliveries IS
  'Entregas. Cliente só lê. Escrita via edge function ou lojista/motorista da própria empresa.';
