-- Lista as policies ativas de public.orders e sinaliza possíveis conflitos
-- para o fluxo do cliente com insert(...).select().

WITH order_policies AS (
  SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'orders'
),
checks AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM order_policies
      WHERE cmd = 'INSERT'
        AND policyname = 'Customers_Insert_Orders'
    ) AS has_customer_insert,
    EXISTS (
      SELECT 1
      FROM order_policies
      WHERE cmd = 'SELECT'
        AND policyname = 'Customers_Select_Orders'
    ) AS has_customer_select,
    EXISTS (
      SELECT 1
      FROM order_policies
      WHERE cmd = 'ALL'
        AND coalesce(permissive, 'PERMISSIVE') = 'RESTRICTIVE'
    ) AS has_restrictive_all_policy,
    EXISTS (
      SELECT 1
      FROM order_policies
      WHERE policyname ILIKE 'Lojista%'
        AND cmd IN ('ALL', 'INSERT')
    ) AS lojista_writes_customer_conflict
)
SELECT
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM order_policies
ORDER BY
  CASE cmd
    WHEN 'INSERT' THEN 1
    WHEN 'SELECT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
    ELSE 6
  END,
  policyname;

SELECT
  has_customer_insert,
  has_customer_select,
  has_restrictive_all_policy,
  lojista_writes_customer_conflict,
  CASE
    WHEN NOT has_customer_insert THEN 'ERRO: falta policy INSERT do cliente.'
    WHEN NOT has_customer_select THEN 'ERRO: falta policy SELECT do cliente para insert(...).select().'
    WHEN has_restrictive_all_policy THEN 'ERRO: existe policy RESTRICTIVE/FOR ALL que pode bloquear inserts do cliente.'
    WHEN lojista_writes_customer_conflict THEN 'ERRO: existe policy do lojista com ALL/INSERT que pode interferir no cliente.'
    ELSE 'OK: policies compatíveis com o fluxo do cliente.'
  END AS validation_result
FROM checks;