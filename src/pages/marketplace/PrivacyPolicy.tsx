import React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MarketplaceLayout from "@/components/marketplace/MarketplaceLayout";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <MarketplaceLayout>
      <div className="bg-white min-h-screen">
        <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-900 shadow-sm border border-slate-100">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-black text-slate-900">Política de Privacidade</h1>
        </header>

        <div className="px-6 pb-24 space-y-8 text-slate-600 leading-relaxed font-medium">
          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">1. Introdução</h2>
            <p>
              O É Pra Já valoriza a sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações quando você utiliza nosso aplicativo e serviços.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">2. Coleta de Dados</h2>
            <p>
              Coletamos informações que você nos fornece diretamente ao criar uma conta, fazer um pedido ou entrar em contato conosco. Isso inclui:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Dados de Identificação: Nome, e-mail, telefone e endereço CPF.</li>
              <li>Dados de Localização: Precisamos da sua localização para mostrar lojas próximas e gerenciar entregas.</li>
              <li>Dados de Pagamento: Informações processadas de forma segura por nossos parceiros de pagamento.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">3. Uso das Informações</h2>
            <p>
              Utilizamos seus dados para:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Processar e entregar seus pedidos.</li>
              <li>Personalizar sua experiência no marketplace.</li>
              <li>Enviar atualizações sobre o status do pedido e promoções (se autorizado).</li>
              <li>Garantir a segurança da plataforma e prevenir fraudes.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">4. Seus Direitos</h2>
            <p>
              Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações do seu perfil no aplicativo. Em conformidade com a LGPD, garantimos a transparência total sobre o processamento de suas informações.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">5. Exclusão de Conta</h2>
            <p>
              O usuário pode solicitar a exclusão definitiva de sua conta e todos os dados associados diretamente no menu de Perfil. Este processo é irreversível e remove todos os seus registros de nossos servidores ativos.
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
