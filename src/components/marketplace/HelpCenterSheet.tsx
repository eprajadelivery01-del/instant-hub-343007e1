import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SupportChat } from '@/components/chat/SupportChat';
import { OrderStoreChat } from '@/components/marketplace/OrderStoreChat';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, Headphones, CreditCard, Tag, User,
  Info, ShoppingBag, FileText, Shield, AlertTriangle,
  ChevronRight, ChevronDown, CheckCircle2, Clock, X,
  MessageCircle, ExternalLink, HelpCircle
} from 'lucide-react';

interface HelpCenterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders?: any[];
  onOpenDriverApplication?: () => void;
}

interface CategoryFAQ {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
  questions: { q: string; a: string }[];
}

const CATEGORIES: CategoryFAQ[] = [
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Pagamentos',
    subtitle: 'Reembolso, problemas, cobranças...',
    questions: [
      {
        q: 'Como funciona o estorno ou reembolso?',
        a: 'Quando um pedido é cancelado antes do preparo ou por ocorrência aceita pelo estabelecimento, o valor é estornado automaticamente na mesma forma de pagamento utilizada ou creditado na sua carteira.',
      },
      {
        q: 'Quais são as formas de pagamento aceitas?',
        a: 'Você pode pagar diretamente pelo app via Cartão de Crédito, Débito e PIX, ou escolher pagar na entrega com dinheiro (com opção de troco) ou máquina de cartão.',
      },
      {
        q: 'Fui cobrado a mais ou tive cobrança indevida?',
        a: 'Caso identifique qualquer divergência em sua fatura, entre em contato imediatamente com nossa equipe pelo botão "Falar com Atendente" com o código do pedido em mãos.',
      },
    ],
  },
  {
    id: 'coupons',
    icon: Tag,
    title: 'Promoções & Cupons',
    subtitle: 'Cupons, fidelidade, descontos...',
    questions: [
      {
        q: 'Como aplicar um cupom de desconto?',
        a: 'Na tela da sacola/finalização do pedido, localize o campo "Cupom de Desconto", digite o código promocional e toque em "Aplicar". O desconto será recalculado na hora.',
      },
      {
        q: 'Por que meu cupom não foi aceito?',
        a: 'Verifique se o cupom ainda está dentro do prazo de validade, se o valor mínimo do pedido foi atingido ou se o cupom é exclusivo para novos clientes ou lojas específicas.',
      },
    ],
  },
  {
    id: 'account',
    icon: User,
    title: 'Conta',
    subtitle: 'Dados cadastrais, endereço, senha...',
    questions: [
      {
        q: 'Como alterar meu número de telefone ou endereço?',
        a: 'Acesse seu Perfil > Editar Meus Dados ou vá em "Endereços" para adicionar, remover ou definir um local padrão para suas entregas.',
      },
      {
        q: 'Como recuperar o acesso à minha conta?',
        a: 'Na tela de login, utilize seu e-mail cadastrado ou faça login rápido com Google. Se precisar redefinir a senha, clique em "Esqueci minha senha".',
      },
    ],
  },
  {
    id: 'about',
    icon: Info,
    title: 'Sobre o É Pra Já',
    subtitle: 'Conheça nossa plataforma e serviços...',
    questions: [
      {
        q: 'O que é a plataforma É Pra Já?',
        a: 'O É Pra Já é o aplicativo completo de delivery da sua cidade, conectando os melhores restaurantes, mercados, farmácias e entregadores locais com rapidez e segurança.',
      },
      {
        q: 'Como posso cadastrar meu estabelecimento?',
        a: 'Acesse nosso portal do lojista ou fale com nossa equipe pelo suporte para receber as condições de parceria e começar a vender no marketplace.',
      },
    ],
  },
  {
    id: 'orders',
    icon: ShoppingBag,
    title: 'Produtos e Serviços',
    subtitle: 'Prazos de entrega, produtos, pedidos...',
    questions: [
      {
        q: 'Como acompanhar o andamento da minha entrega?',
        a: 'Na aba "Pedidos" você vê o status do seu pedido em tempo real (Confirmado, Em preparo, Saiu para entrega e Entregue) com previsão atualizada.',
      },
      {
        q: 'Meu pedido está demorando mais do que o previsto?',
        a: 'Você pode abrir o chat direto com a loja tocando no botão flutuante de conversa ou no pedido em andamento para consultar o tempo de preparo com o restaurante.',
      },
    ],
  },
  {
    id: 'policies',
    icon: FileText,
    title: 'Políticas e Termos',
    subtitle: 'Cancelamento, termos de uso...',
    questions: [
      {
        q: 'Posso cancelar um pedido já realizado?',
        a: 'Pedidos com status "Pendente" ou "Em preparo" podem ser cancelados diretamente na tela de detalhes do pedido antes do envio pelo estabelecimento.',
      },
      {
        q: 'Quais são as regras de devolução?',
        a: 'Se o item entregue estiver incorreto ou com defeito, tire uma foto do produto recebido e acione o suporte online imediatamente.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: Shield,
    title: 'Privacidade e Dados',
    subtitle: 'Compartilhamento de dados, LGPD...',
    questions: [
      {
        q: 'Como meus dados pessoais são protegidos?',
        a: 'Seguimos rigorosamente a LGPD. Seus dados cadastrais e de pagamento são protegidos por criptografia de ponta a ponta e nunca são compartilhados sem seu consentimento.',
      },
    ],
  },
  {
    id: 'security',
    icon: AlertTriangle,
    title: 'Segurança e Emergência',
    subtitle: 'Orientações urgentes e suporte seguro...',
    questions: [
      {
        q: 'Tive um problema urgente na entrega, o que fazer?',
        a: 'Utilize o botão "Falar com Atendente" no topo desta tela para atendimento imediato com prioridade de segurança da nossa equipe de suporte.',
      },
    ],
  },
];

export function HelpCenterSheet({ open, onOpenChange, orders = [], onOpenDriverApplication }: HelpCenterSheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFAQ | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [showDirectChat, setShowDirectChat] = useState(false);
  const [chatTopic, setChatTopic] = useState('support');
  const [chatTitle, setChatTitle] = useState('Central de Ajuda');
  const [selectedOrderChat, setSelectedOrderChat] = useState<{ orderId: string; companyId: string; companyName?: string } | null>(null);

  const recentOrders = orders.slice(0, 3);

  const handleOpenSupport = (topic = 'support', title = 'Atendimento Online') => {
    setChatTopic(topic);
    setChatTitle(title);
    setShowDirectChat(true);
  };

  const handleHelpWithOrder = (ord: any) => {
    setSelectedOrderChat({
      orderId: ord.id,
      companyId: ord.company_id || ord.companies?.id,
      companyName: ord.companies?.name || 'Restaurante',
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" hideClose className="h-[92vh] rounded-t-[2.5rem] border-none p-0 shadow-2xl overflow-hidden" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Central de Ajuda</SheetTitle>
          <div className="h-full flex flex-col bg-background">
            
            {/* Top Navigation Bar */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2">
                {selectedCategory ? (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setExpandedQuestion(null);
                    }}
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </button>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-display font-bold tracking-tight text-foreground">
                      {selectedCategory ? selectedCategory.title : 'AJUDA'}
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      online
                    </span>
                  </div>
                  {!selectedCategory && (
                    <p className="text-[11px] text-muted-foreground">Central de Atendimento É Pra Já</p>
                  )}
                </div>
              </div>

              {/* Headset Quick Button */}
              <button
                onClick={() => handleOpenSupport('support', 'Suporte da Plataforma')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform"
                title="Falar com atendente online"
              >
                <Headphones className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold font-display hidden sm:inline">Suporte</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-20">
              
              {selectedCategory ? (
                /* Category Questions View */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <selectedCategory.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{selectedCategory.title}</p>
                      <p className="text-xs text-muted-foreground">{selectedCategory.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Dúvidas Frequentes</p>
                  
                  <div className="space-y-2.5">
                    {selectedCategory.questions.map((item, idx) => {
                      const isExpanded = expandedQuestion === idx;
                      return (
                        <div key={idx} className="rounded-2xl bg-card border border-border overflow-hidden transition-all">
                          <button
                            onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                            className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-sm font-semibold text-foreground">{item.q}</span>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Fallback to human support */}
                  <div className="pt-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">Não encontrou sua resposta?</p>
                        <p className="text-xs text-muted-foreground">Fale diretamente com um atendente agora mesmo.</p>
                      </div>
                      <button
                        onClick={() => handleOpenSupport(`faq_${selectedCategory.id}`, `Suporte - ${selectedCategory.title}`)}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Falar com atendente
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Main View */
                <>
                  {/* SEÇÃO 1: ÚLTIMOS PEDIDOS (Conforme prints do usuário) */}
                  {recentOrders.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 px-1">Últimos pedidos</p>
                      <div className="space-y-3">
                        {recentOrders.map((ord) => {
                          const isFinished = ['delivered', 'completed', 'cancelled'].includes(ord.status);
                          const storeName = ord.companies?.name || 'Restaurante';
                          const storeLogo = ord.companies?.logo_url;
                          const formattedDate = ord.created_at
                            ? new Date(ord.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
                            : 'Data recente';
                          const formattedTotal = Number(ord.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                          return (
                            <div key={ord.id} className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden p-4">
                              <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-11 h-11 rounded-full bg-muted overflow-hidden shrink-0 border border-border flex items-center justify-center font-bold text-sm text-foreground/80">
                                    {storeLogo ? (
                                      <img src={storeLogo} alt={storeName} className="w-full h-full object-cover" />
                                    ) : (
                                      storeName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-display font-bold text-sm text-foreground truncate">{storeName}</p>
                                    <p className="text-[11px] text-muted-foreground">{formattedDate}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-mono font-semibold text-muted-foreground">
                                  #{ord.id.slice(-6).toUpperCase()}
                                </span>
                              </div>

                              <div className="pt-3 flex items-center justify-between text-xs">
                                <div>
                                  <p className="text-muted-foreground text-[11px]">Total com entrega</p>
                                  <p className="font-bold text-foreground text-sm">{formattedTotal}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("w-2 h-2 rounded-full", isFinished ? "bg-muted-foreground/50" : "bg-emerald-500 animate-pulse")} />
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {isFinished ? 'Pedido finalizado' : 'Em andamento'}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-end">
                                <button
                                  onClick={() => handleHelpWithOrder(ord)}
                                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 active:scale-98 transition-transform"
                                >
                                  Ajuda com este pedido
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 2: CATEGORIAS (Conforme lista do print) */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 px-1">Categorias</p>
                    <div className="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat)}
                            className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left active:bg-muted"
                          >
                            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-foreground/75" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground tracking-tight">{cat.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.subtitle}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SEÇÃO 3: ATENDIMENTOS (Atendimento direto / online) */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 px-1">Atendimentos</p>
                    <div className="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
                      <button
                        onClick={() => handleOpenSupport('support', 'Central de Ajuda - Atendente')}
                        className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-muted/50 transition-colors text-left active:bg-muted"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Headphones className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">Falar com Atendente</p>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              Online
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Atendimento em tempo real com a equipe É Pra Já
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Direct Human Support Chat Modal */}
      {showDirectChat && (
        <Sheet open={showDirectChat} onOpenChange={setShowDirectChat}>
          <SheetContent side="bottom" hideClose className="h-[88vh] rounded-t-[2.5rem] border-none p-0 overflow-hidden shadow-2xl z-[120]" aria-describedby={undefined}>
            <SheetTitle className="sr-only">{chatTitle}</SheetTitle>
            <div className="flex flex-col h-full bg-background relative">
              <SupportChat
                title={chatTitle}
                topic={chatTopic}
                onClose={() => setShowDirectChat(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Order Specific Chat Modal */}
      {selectedOrderChat && (
        <Sheet open={!!selectedOrderChat} onOpenChange={(open) => !open && setSelectedOrderChat(null)}>
          <SheetContent side="bottom" hideClose className="h-[88vh] rounded-t-[2.5rem] border-none p-0 shadow-2xl overflow-hidden z-[120]" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Chat do Pedido</SheetTitle>
            <div className="h-full bg-background flex flex-col">
              <OrderStoreChat
                orderId={selectedOrderChat.orderId}
                companyId={selectedOrderChat.companyId}
                companyName={selectedOrderChat.companyName}
                onClose={() => setSelectedOrderChat(null)}
                fullHeight
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export default HelpCenterSheet;
