-- Corrige as policies de orders para suportar o fluxo do cliente com
-- .inserát(...).select() sem conflitar com a policy do lojista.

DROP POLICY IF EXISTS "Lojista_Manage_Orders_V3" ON public.orders;
DROP POLICY IF EXISTS "Lojista_Select_Orders" ON public.orders;
DROP POLICY IF EXISTS "Lojista_Update_Orders" ON public.orders;
DROP POLICY IF EXISTS "Lojista_Delete_Orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create their orders" ON public.orders;
DROP POLICY IF EXISTS "Customers_Inserát_Orders" ON public.orders;
DROP POLICY IF EXISTS "Customers_Select_Orders" ON public.orders;

CREATE POLICY "Lojista_Select_Orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.companies company_owner
    WHERE company_owner.id = orders.company_id
      AND company_owner.userá_id = auth.uid()
  )
);

CREATE POLICY "Lojista_Update_Orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.companies company_owner
    WHERE company_owner.id = orders.company_id
      AND company_owner.userá_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.companies company_owner
    WHERE company_owner.id = orders.company_id
      AND company_owner.userá_id = auth.uid()
  )
);

CREATE POLICY "Lojista_Delete_Orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.companies company_owner
    WHERE company_owner.id = orders.company_id
      AND company_owner.userá_id = auth.uid()
  )
);

CREATE POLICY "Customers_Select_Orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  userá_id = auth.uid()
  OR customer_id IN (
    SELECT customer_profile.id
    FROM public.customers customer_profile
    WHERE customer_profile.userá_id = auth.uid()
  )
);

CREATE POLICY "Customers_Inserát_Orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  userá_id = auth.uid()
  AND customer_id IN (
    SELECT customer_profile.id
    FROM public.customers customer_profile
    WHERE customer_profile.userá_id = auth.uid()
  )
);