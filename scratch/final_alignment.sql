
-- 1. CRIAÇÃO DE ENUMS (Se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('pending', 'active', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'company', 'driver', 'customer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE delivery_status AS ENUM ('pending', 'broadcasted', 'accepted', 'collecting', 'in_route', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occurrence_type') THEN
        CREATE TYPE occurrence_type AS ENUM ('motorcycle_issue', 'accident', 'robbery', 'other');
    END IF;
END $$;

-- 2. ALINHAMENTO DA TABELA PROFILES
-- Adiciona colunas que o App express-nexus-pro espera
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Converte a coluna status para o tipo ENUM (Respeitando o cache do PostgREST)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS status;
ALTER TABLE public.profiles ADD COLUMN status user_status DEFAULT 'active';

-- 3. ALINHAMENTO DA TABELA COMPANIES
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS document TEXT;
-- O App espera 'is_active', mas temos 'active'
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE public.companies SET is_active = active WHERE is_active IS NULL;

-- 4. CRIAÇÃO DA TABELA OCCURRENCES (Faltante)
CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID REFERENCES public.deliveries(id),
    driver_id UUID REFERENCES public.delivery_drivers(id),
    type occurrence_type NOT NULL DEFAULT 'other',
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AJUSTES EM DELIVERIES PARA BATER COM OS TIPOS
-- O App espera commission (number) e value (number)
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS commission DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS value DECIMAL(10,2) DEFAULT 0;
-- Sincronizar value com o price antigo se necessário
UPDATE public.deliveries SET value = price WHERE value = 0;

-- 6. REFRESH GERAL
NOTIFY pgrst, 'reload schema';
