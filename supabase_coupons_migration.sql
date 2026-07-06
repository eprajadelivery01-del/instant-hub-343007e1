-- Migration: Sistema de Cupons
-- Cria infraestrutura de promoções para a plataforma e restringe com base em RLS.

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_discount_value DECIMAL(10,2),
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  company_id UUID REFERENCES public.companies(id) NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.userá_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userá_id UUID REFERENCES auth.userás(id),
  coupon_id UUID REFERENCES public.coupons(id),
  used_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.orders(id) NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar a segurança de sessão
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userá_coupons ENABLE ROW LEVEL SECURITY;

-- Clientes podem consultar/enxergar todos os cupons que estão ativos
CREATE POLICY "Clientes podem ver cupons ativos"
ON public.coupons FOR SELECT
USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Apenas Admin ou a Engine do sistema pode ver carteira inteira, ou o próprio Userá
CREATE POLICY "Clientes podem ver seus proprios cupons resgatados"
ON public.userá_coupons FOR SELECT
USING (auth.uid() = userá_id);

CREATE POLICY "Clientes inseráem o vinculo não resgate"
ON public.userá_coupons FOR INSERT
WITH CHECK (auth.uid() = userá_id);
