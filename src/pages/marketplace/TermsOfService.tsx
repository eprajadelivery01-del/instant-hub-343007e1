import React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MarketplaceLayout from "@/components/marketplace/MarketplaceLayout";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <MarketplaceLayout>
      <main className="flex-1 overflow-y-auto bg-background">
        <header className="px-6 pb-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 pt-[calc(env(safe-area-inset-top,0px)+3rem)]">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-900 shadow-sm border border-slate-100">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-black text-slate-900">Termos de Uso</h1>
        </header>

        <div className="px-6 pb-24 space-y-8 text-slate-600 leading-relaxed font-medium">
          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">1. Aceitação dos Termos</h2>
            <p>
              Ao utilizar o É Pra Já, você concorda em cumprir estes Termos de Uso. Se você não concordar com qualquer parte destes termos, você não deve utilizar nossos serviços.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">2. Descrição do Serviço</h2>
            <p>
              O É Pra Já é uma plataforma de marketplace que conecta consumidores a estabelecimentos locais (restaurantes, mercados, etc.) e prestadores de serviço de entrega. Não somos responsáveis pela fabricação dos produtos, apenas pela intermediação e entrega.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">3. Cadastro e Conta</h2>
            <p>
              Para fazer pedidos, você deve criar uma conta fornecendo dados verídicos. Você é o único responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">4. Pagamentos e Cancelamentos</h2>
            <p>
              Os preços dos produtos são definidos pelos lojistas. O É Pra Já reserva o direito de cobrar taxas de entrega e de serviço. Cancelamentos seguem as regras de cada estabelecimento e do Código de Defesa do Consumidor.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">5. Uso Indevido</h2>
            <p>
              É proibido utilizar a plataforma para fins ilegais, fraude ou para assediar outros usuários e entregadores. Reservamo-nos o direito de suspender contas que violem estas diretrizes.
            </p>
          </section>

          <div className="pt-8 border-t border-slate-100 italic text-sm text-slate-400">
            Última atualização: 08 de Abril de 2026.
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
}
