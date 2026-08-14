-- Políticas para permitir deleção de conversas e mensagens por admins e participantes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.conversations'::regclass AND polname = 'Admins and participants can delete conversations'
  ) THEN
    CREATE POLICY "Admins and participants can delete conversations"
    ON public.conversations
    FOR DELETE
    TO authenticated
    USING (
      (auth.uid() = ANY (participants)) 
      OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'::app_role
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.messages'::regclass AND polname = 'Admins and participants can delete messages'
  ) THEN
    CREATE POLICY "Admins and participants can delete messages"
    ON public.messages
    FOR DELETE
    TO authenticated
    USING (
      (sender_id = auth.uid()) 
      OR EXISTS (
        SELECT 1 FROM public.conversations
        WHERE conversations.id = messages.conversation_id
        AND (
          (auth.uid() = ANY (conversations.participants))
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'::app_role
          )
        )
      )
    );
  END IF;
END $$;
