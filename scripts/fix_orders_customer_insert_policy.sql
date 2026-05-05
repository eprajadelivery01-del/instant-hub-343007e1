DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;

CREATE POLICY "Customers can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = auth.uid()
  )
);