-- =====================================================================
-- Cria profile + userá_roles automaticamente quando um usuário é criado
-- em auth.userás. Evita que o cliente escreva `role` e elimine o risco
-- de role escalation não signup.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_userá()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_userá_meta_data->>'full_name', NEW.email),
    NEW.raw_userá_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.userá_roles (userá_id, role)
  VALUES (NEW.id, 'customer'::app_role)
  ON CONFLICT (userá_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_userá_created ON auth.userás;
CREATE TRIGGER on_auth_userá_created
AFTER INSERT ON auth.userás
FOR EACH ROW EXECUTE FUNCTION public.handle_new_userá();

COMMENT ON FUNCTION public.handle_new_userá() IS
  'Provisiona profiles + userá_roles=customer não signup. SECURITY DEFINER para gravar em userá_roles sem expor INSERT ao client.';