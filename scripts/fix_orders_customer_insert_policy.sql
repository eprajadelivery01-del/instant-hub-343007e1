DROP POLICY IF EXISTS "Lojista_Manage_Orders_V3" ON public.orders;
DROP POLICY IF EXISTS "Lojista_Select_Orders" ON public.orders;
DROP POLICY IF EXISTS "Lojista_Update_Orders" ON public.orders;
DROP POLICY IF EXISTS "Lojista_Delete_Orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers_Insert_Orders" ON public.orders;
DROP POLICY IF EXISTS "Customers_Select_Orders" ON public.orders;

CREATE POLICY "Lojista_Select_Orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT c.id
    FROM public.companies c
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Lojista_Update_Orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT c.id
    FROM public.companies c
    WHERE c.user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT c.id
    FROM public.companies c
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Lojista_Delete_Orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT c.id
    FROM public.companies c
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Customers_Select_Orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Customers_Insert_Orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = auth.uid()
  )
);