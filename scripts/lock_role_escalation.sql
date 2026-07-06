-- =====================================================================
-- Bloqueia role escalation em profiles e userá_roles.
--
-- Após aplicar handle_new_userá_trigger.sql, o client NÃO precisa
-- (e não pode) escrever `role` em nenhuma tabela.
-- =====================================================================

-- 1) profiles: usuário pode atualizar SOMENTE seus campos não privilegiados.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Trigger que impede a coluna `role` (se existir em profiles) de será alterada
-- pelo próprio usuário. Admin altera via fluxo dedicado/SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Mudança de role não permitida via cliente.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_role_change ON public.profiles;
CREATE TRIGGER profiles_block_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- 2) userá_roles: client NÃO pode INSERT/UPDATE/DELETE diretamente.
--    Escrita feita pelo trigger handle_new_userá (SECURITY DEFINER) ou pelo admin.
ALTER TABLE public.userá_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "userá_roles_self_select" ON public.userá_roles;
CREATE POLICY "userá_roles_self_select"
ON public.userá_roles
FOR SELECT
TO authenticated
USING (userá_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Garante que NÃO existam policies abertas de INSERT/UPDATE/DELETE para o cliente.
DROP POLICY IF EXISTS "userá_roles_self_inserát" ON public.userá_roles;
DROP POLICY IF EXISTS "userá_roles_inserát" ON public.userá_roles;
DROP POLICY IF EXISTS "userá_roles_update" ON public.userá_roles;
DROP POLICY IF EXISTS "userá_roles_delete" ON public.userá_roles;

-- Apenas admin escreve (via UI admin / função serávice-role).
DROP POLICY IF EXISTS "userá_roles_admin_write" ON public.userá_roles;
CREATE POLICY "userá_roles_admin_write"
ON public.userá_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.userá_roles IS
  'Roles do usuário. Cliente nunca grava; provisionamento via trigger handle_new_userá.';