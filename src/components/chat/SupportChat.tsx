import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, User as UserIcon, Trash2, Check, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

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
        const storageKey = `epraja_chat_${topic}_${user.id}`;
        const storedConvId = localStorage.getItem(storageKey);
        
        let conversation = null;

        // Se já temos um chat salvo para esse tópico, tenta buscar ele
        if (storedConvId) {
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', storedConvId)
            .maybeSingle();
            
          if (existingConv) {
            conversation = existingConv;
          }
        }

        // Se não encontrou, cria um novo chat limpo para esse tópico!
        if (!conversation) {
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({ 
              participants: [user.id]
            })
            .select();
          
          if (createError) {
             console.error("Falha ao criar conversa:", createError);
          } else if (newConv && newConv.length > 0) {
             conversation = newConv[0];
             localStorage.setItem(storageKey, conversation.id);
             
             // Envia a mensagem de assunto para o Admin saber do que se trata
             await supabase.from('messages').insert({
               conversation_id: conversation.id,
               sender_id: user.id,
               content: `[Assunto: ${title}]`
             });
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

          // Subscription Realtime com nome único para evitar conflitos de React StrictMode
          const channelName = `conversation_${conversation.id}_${Math.random().toString(36).substring(7)}`;
          const channel = supabase.channel(channelName)
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
  }, [user, topic, title]);

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
      setMessages(prev => [...prev, optimisticMsg]);

      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: msgText
      }).select().single();

      if (error) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        throw error;
      }

      if (data) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
      }
    } catch (err) {
      console.error("[SupportChat] Erro ao enviar:", err);
      toast.error("Falha ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleEndChat = () => {
    if (window.confirm("Deseja encerrar este chat e começar um novo?")) {
      const storageKey = `epraja_chat_${topic}_${user.id}`;
      localStorage.removeItem(storageKey);
      setMessages([]);
      setConversationId(null);
      setLoading(true);
      setTimeout(() => window.location.reload(), 300);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2] dark:bg-[#0B141A] relative">
      <div className="absolute inset-0 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] opacity-10 dark:opacity-[0.03] mix-blend-multiply dark:mix-blend-screen pointer-events-none z-0" />
      
      <div className="flex items-center gap-3 px-4 py-3 bg-[#008069] dark:bg-[#202C33] text-white z-10 shadow-sm">
        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <UserIcon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-medium truncate">{title}</h3>
          <p className="text-[13px] text-white/80 truncate">online</p>
        </div>
        {conversationId && messages.length > 0 && (
          <button 
            onClick={handleEndChat}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all shrink-0"
            title="Encerrar Chat"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white dark:bg-[#202C33] px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#008069] dark:text-[#00A884]" />
              <span className="text-[13px] text-muted-foreground">Conectando...</span>
            </div>
          </div>
        ) : (
          messages.filter(msg => !msg.content.startsWith('[Assunto:')).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-[#FFEECD] dark:bg-[#182229] px-4 py-2 rounded-xl shadow-sm mb-6 max-w-[280px]">
                <p className="text-[12.5px] text-[#54656F] dark:text-[#8696A0] leading-relaxed">
                  As mensagens enviadas a este chat são seguras. Escolha uma opção abaixo para iniciar.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-[320px]">
                {QUICK_MESSAGES.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(undefined, m.text)}
                    disabled={!conversationId || sending}
                    className="px-4 py-2 rounded-full bg-white dark:bg-[#202C33] border border-border/10 text-[13px] font-medium text-[#111B21] dark:text-[#E9EDEF] hover:bg-[#F5F6F6] dark:hover:bg-[#2A3942] active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.filter(msg => !msg.content.startsWith('[Assunto:')).map(msg => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`relative max-w-[85%] px-2.5 py-1.5 rounded-[12px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                      isMe 
                        ? 'bg-[#D9FDD3] dark:bg-[#005C4B] rounded-tr-[4px] text-[#111B21] dark:text-[#E9EDEF]' 
                        : 'bg-white dark:bg-[#202C33] rounded-tl-[4px] text-[#111B21] dark:text-[#E9EDEF]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap pl-1 pr-2 pt-1 pb-4">
                        {msg.content}
                      </p>
                      <div className="flex items-center justify-end gap-1 absolute bottom-1 right-2">
                        <span className={`text-[11px] ${isMe ? 'text-[#667781] dark:text-[#8696A0]' : 'text-[#667781] dark:text-[#8696A0]'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <CheckCheck className="h-[14px] w-[14px] text-[#53BDEB]" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      <div className="px-4 py-3 bg-[#F0F2F5] dark:bg-[#202C33] z-10">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="flex-1 bg-white dark:bg-[#2A3942] rounded-full flex items-center px-4 h-11 shadow-sm">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Mensagem"
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#111B21] dark:text-[#E9EDEF] placeholder:text-[#8696A0]"
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || !conversationId || sending}
            className="w-11 h-11 rounded-full bg-[#00A884] flex items-center justify-center shrink-0 shadow-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white ml-1" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
