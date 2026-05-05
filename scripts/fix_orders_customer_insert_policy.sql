DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;

CREATE POLICY "Customers can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR auth.uid() = customer_id
);