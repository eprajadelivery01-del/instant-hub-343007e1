import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Store } from 'lucide-react';

interface OrderStoreChatProps {
  orderId: string;
  companyId: string;
  companyName?: string | null;
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
export function OrderStoreChat({ orderId, companyId, companyName }: OrderStoreChatProps) {
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
      if (active) setMessages(history || []);
      setLoading(false);

      channel = supabase
        .channel(`order_chat_${session.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${session.id}` },
          (payload) => {
            const m = payload.new as any; // Usando any momentaneamente ou ajustando Msg interface abaixo
            setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
          },
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, topic, companyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const msg = (customText || text).trim();
    if (!msg || !sessionId || !user || sending) return;
    setText('');
    setSending(true);
    await supabase.from('messages').insert({
      conversation_id: sessionId,
      sender_id: user.id,
      content: msg,
    });
    setSending(false);
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Store className="h-3.5 w-3.5" />
        <span>Conversa com {companyName || 'o lojista'}</span>
      </div>
      <div className="h-52 overflow-y-auto space-y-2 mb-3 p-3 border border-border rounded-xl bg-secondary/30">
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
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card text-foreground rounded-bl-md border border-border'
                  }`}
                >
                  {(m as any).content || m.message}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              send(undefined, msg);
            }}
            className="shrink-0 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary active:scale-95 transition-all"
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