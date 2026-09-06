import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Store, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderStoreChatProps {
  orderId: string;
  companyId: string;
  companyName?: string | null;
  fullHeight?: boolean;
  className?: string;
  onClose?: () => void;
}

interface Msg {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

/**
 * Chat between the customer and the store, scoped to a specific order.
 * Uses conversations + messages.
 * Becomes available as soon as the order is accepted by the merchant.
 */
export function OrderStoreChat({ orderId, companyId, companyName, fullHeight, className, onClose }: OrderStoreChatProps) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const topic = `order_${orderId}`;

  const QUICK_MESSAGES = [
    "Onde está meu pedido? 🛵",
    "Pode mandar mais guardanapo? 🍽️",
    "Preciso mudar o endereço 🏠",
    "Já saiu para entrega? ✨"
  ];

  useEffect(() => {
    if (!user) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      try {
        const { data: companyData } = await supabase.from('companies').select('user_id').eq('id', companyId).maybeSingle();
        const companyUserId = companyData?.user_id;

        let { data: session } = await supabase
          .from('conversations')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle();

        if (!session) {
          const { data: created } = await supabase
            .from('conversations')
            .insert({ 
              order_id: orderId, 
              participants: companyUserId ? [user.id, companyUserId] : [user.id, companyId],
              topic: 'Suporte do Pedido' 
            })
            .select()
            .single();
          session = created;
        }
        if (!active || !session) { setLoading(false); return; }
        setSessionId(session.id);
        const { data: history } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', session.id)
          .order('created_at', { ascending: true });

        let currentMsgs = history || [];

        // Auto-mensagem de boas-vindas do restaurante como 1ª mensagem garantida
        const storeSenderId = companyUserId || companyId;
        const hasStoreMessage = currentMsgs.some(m => m.sender_id !== user.id);

        if (!hasStoreMessage) {
          try {
            const { data: comp } = await supabase
              .from('companies')
              .select('opening_hours')
              .eq('id', companyId)
              .maybeSingle();

            const hours = typeof comp?.opening_hours === 'string'
              ? JSON.parse(comp.opening_hours)
              : (comp?.opening_hours || {});

            if (hours.auto_message_enabled !== false) {
              const DEFAULT_AUTO_MESSAGE = `Olá! Pedido confirmado com sucesso! 🚀✨\nNossa equipe já iniciou o preparo com todo capricho e atenção aos detalhes.\n\nQualquer dúvida ou observação sobre seu pedido, estamos à sua disposição aqui pelo chat. Bom apetite! 🍽️🛵`;
              const autoText = (typeof hours.auto_message === 'string' && hours.auto_message.trim())
                ? hours.auto_message.trim()
                : DEFAULT_AUTO_MESSAGE;

              const autoMsgId = crypto.randomUUID();
              const autoMsg: Msg = {
                id: autoMsgId,
                sender_id: storeSenderId,
                message: autoText,
                created_at: new Date().toISOString(),
              };

              currentMsgs = [autoMsg, ...currentMsgs];

              // Persiste na tabela messages do Supabase
              supabase.from('messages').insert({
                id: autoMsgId,
                conversation_id: session.id,
                sender_id: storeSenderId,
                content: autoText,
              }).then(({ error }) => {
                if (error) console.warn('[OrderStoreChat] Erro ao gravar auto-mensagem:', error);
              });
            }
          } catch (e) {
            console.warn('[OrderStoreChat] Erro ao verificar auto-mensagem:', e);
          }
        }

        if (!active) return;
        setMessages(currentMsgs);
        setLoading(false);

        const channelName = `order_chat_${session.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${session.id}` },
            (payload) => {
              const m = payload.new as any;
              setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
            },
          );

        if (!active) {
          supabase.removeChannel(channel);
          channel = null;
          return;
        }

        channel.subscribe();
      } catch (err) {
        console.error('[OrderStoreChat] Erro ao carregar chat:', err);
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [user, orderId, companyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isSendingRef = useRef(false);

  const send = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const msg = (customText || text).trim();
    if (!msg || !sessionId || !user || isSendingRef.current) return;
    
    isSendingRef.current = true;
    setText('');
    setSending(true);

    const messageId = crypto.randomUUID();
    
    // Optimistic Update: Mostra a mensagem na tela instantaneamente
    const optimisticMsg = {
      id: messageId,
      sender_id: user.id,
      message: msg,
      content: msg,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, optimisticMsg as any]);
    setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    
    // Libera a UI imediatamente (Fire-and-forget)
    setSending(false);
    isSendingRef.current = false;
    
    supabase.from('messages').insert({
      id: messageId,
      conversation_id: sessionId,
      sender_id: user.id,
      content: msg,
    }).then(({ error }) => {
      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        // Rollback da mensagem em caso de falha
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    });
  };

  return (
    <div className={className || "mt-3 flex flex-col h-full"}>
      {onClose && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{companyName || 'Lojista'}</p>
              <p className="text-[10px] text-muted-foreground font-mono">Pedido #{orderId.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
      {!fullHeight && !onClose && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <Store className="h-3.5 w-3.5" />
          <span>Conversa com {companyName || 'o lojista'}</span>
        </div>
      )}
      <div className={cn(
        "overflow-y-auto space-y-2.5 p-3 border border-border rounded-2xl bg-secondary/20 flex-1 min-h-0",
        fullHeight ? "my-3 mx-4" : "h-52 mb-3 rounded-xl bg-secondary/30"
      )}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Envie uma mensagem para o lojista se precisar de algo.
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === user?.id;
            const content = (m as any).content || m.message;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-xs shadow-2xs whitespace-pre-line leading-relaxed ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-xs font-medium'
                      : 'bg-card text-foreground rounded-bl-xs border border-border/80'
                  }`}
                >
                  {!isMe && (
                    <span className="text-[10px] font-bold text-primary block mb-1">
                      {companyName || 'Restaurante'}
                    </span>
                  )}
                  <p>{content}</p>
                  {m.created_at && (
                    <span className={`text-[9px] block text-right mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Sugestões de Respostas */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide">
        {QUICK_MESSAGES.map((msg, i) => (
          <button
            key={i}
            type="button"
            disabled={sending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              send(undefined, msg);
            }}
            className="shrink-0 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {msg}
          </button>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="rounded-xl h-10"
        />
        <Button type="submit" size="icon" id="btn-send-store" className="rounded-xl h-10 w-10 shrink-0" disabled={(!text.trim() && !sending) || !sessionId}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}