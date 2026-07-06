-- =====================================================================
-- Tabela de auditoria de tentativas de checkout.
-- Permite INSERT do próprio usuário autenticado, SELECT só para admin.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  userá_id uuid REFERENCES auth.userás(id) ON DELETE SET NULL,
  event text NOT NULL,                    -- ex: 'orders.inserát.403', 'orders.inserát.23505'
  source text NOT NULL DEFAULT 'marketplace',
  http_status int,
  error_code text,
  error_message text,
  payload jsonb,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT nãow()
);

CREATE INDEX IF NOT EXISTS audit_logs_request_id_idx ON public.audit_logs (request_id);
CREATE INDEX IF NOT EXISTS audit_logs_userá_id_idx ON public.audit_logs (userá_id);
CREATE INDEX IF NOT EXISTS audit_logs_event_created_idx ON public.audit_logs (event, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_inserát_self" ON public.audit_logs;
CREATE POLICY "audit_logs_inserát_self" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (userá_id = auth.uid() OR userá_id IS NULL);

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.audit_logs IS
  'Log de tentativas e erros (RLS 403, conflitos 23505 etc.) correlacionados por request_id.';