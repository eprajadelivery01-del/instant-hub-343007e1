import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, User as UserIcon } from 'lucide-react';

interface SupportChatProps {
  topic: string;
  title: string;
  companyId?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function SupportChat({ topic, title, companyId = null }: SupportChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const QUICK_MESSAGES = [
    { label: "Quero ser entregador 🏍️", text: "Olá! Gostaria de saber como faço para me cadastrar como entregador na plataforma." },
    { label: "Problema no pedido 🍔", text: "Olá! Tive um problema com meu pedido recente e gostaria de suporte." },
    { label: "Falar com suporte 👤", text: "Olá! Gostaria de falar com um atendente humano sobre uma dúvida geral." }
  ];

  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      try {
        // Tenta encontrar uma conversa existente para este usuário
        let { data: conversationsList } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
          
        let conversation = conversationsList?.[0];

        if (!conversation) {
          // Cria uma nova conversa
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({ 
              user_id: user.id
            })
            .select();
          
          if (createError) {
             console.error("Falha ao criar conversa:", createError);
             // Se falhar (por ex: falta de order_id), não crasha, só não atribui
          } else if (newConv && newConv.length > 0) {
             conversation = newConv[0];
          }
        }

        if (conversation) {
          setConversationId(conversation.id);
          const { data: history } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (history) setMessages(history);

          // Subscription Realtime
          const channel = supabase.channel(`conversation_${conversation.id}`)
            .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'messages', 
              filter: `conversation_id=eq.${conversation.id}` 
            }, payload => {
              const newMsg = payload.new as Message;
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            })
            .subscribe();

          setLoading(false);
          return () => { supabase.removeChannel(channel); };
        }
      } catch (err) {
        console.error("[SupportChat] Erro ao inicializar:", err);
        setLoading(false);
      }
    };

    initializeChat();
  }, [user, topic]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const msgText = (customText || newMessage).trim();
    if (!msgText || !user || !conversationId || sending) return;

    const optimisticMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender_id: user.id,
      content: msgText,
      created_at: new Date().toISOString()
    };

    setNewMessage('');
    setSending(true);

    try {
      // Adiciona localmente para feedback instantâneo
      setMessages(prev => [...prev, optimisticMsg]);

      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: msgText
      }).select().single();

      if (error) {
        // Remove otimista se falhar
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        throw error;
      }

      // Substitui a mensagem otimista pela real do banco (com ID correto)
      if (data) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
      }

      await supabase.from('conversations').update({ 
        updated_at: new Date().toISOString() 
      }).eq('id', conversationId);

    } catch (err) {
      console.error("[SupportChat] Erro ao enviar:", err);
      toast.error("Falha ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
          <UserIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground">O administrador responderá em breve</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-[10px] font-bold text-muted-foreground/50 mb-4 uppercase tracking-widest">
              Sugestões de início
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
              {QUICK_MESSAGES.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(undefined, m.text)}
                  disabled={!conversationId || sending}
                  className="px-4 py-3 rounded-2xl bg-card border border-border/50 text-[11px] font-bold text-foreground text-left hover:border-primary hover:bg-primary/5 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className={`p-3 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm shadow-sm'}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-60">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-card border-t border-border flex items-center gap-2">
        <Input 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Escreva sua mensagem..."
          className="flex-1 rounded-full bg-background border-border/40 h-12 px-5"
        />
        <Button disabled={(!newMessage.trim() && !sending) || !conversationId || sending} type="submit" size="icon" className="rounded-full h-12 w-12 shrink-0 shadow-lg active:scale-95 transition-all">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
