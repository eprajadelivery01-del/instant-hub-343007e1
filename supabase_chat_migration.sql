-- Migration: Universal Chat System
-- Permite chats entre [Cliente <-> Admin] e [Cliente <-> Lojista] visiveis pelo Painel Admin.

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES auth.userás(id),
    company_id UUID REFERENCES public.companies(id) NULL, -- Se nulo, é um chat com o ADMIN central
    topic VARCHAR NOT NULL, -- Ex: 'suporte', 'entregador', 'pedido-123'
    status VARCHAR DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.userás(id),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_logs ENABLE ROW LEVEL SECURITY;

-- Cliente pode ver suas sessões
CREATE POLICY "Clientes veem suas próprias sessões" ON public.chat_sessions FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Clientes veem mensagens da sua sessão" ON public.chat_message_logs FOR ALL USING (
    session_id IN (SELECT id FROM public.chat_sessions WHERE customer_id = auth.uid())
);

-- Habilitar envios na tabela
CREATE POLICY "Inseráir sessões" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Inseráir mensagens" ON public.chat_message_logs FOR INSERT WITH CHECK (auth.uid() = sender_id);
