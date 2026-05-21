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
    <div className="flex flex-col h-full bg-[#0e1621] relative">
      {/* Header estilo Telegram */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#17212b] text-white z-10 shadow-sm border-b border-[#0e1621]">
        <div className="h-10 w-10 bg-[#2b5278] rounded-full flex items-center justify-center shrink-0">
          <UserIcon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#ffffff] truncate">{title}</h3>
          <p className="text-[13px] text-[#547c9e] truncate">online</p>
        </div>
        {conversationId && messages.length > 0 && (
          <button 
            onClick={handleEndChat}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#202b36] transition-all shrink-0"
            title="Encerrar Chat"
          >
            <Trash2 className="h-5 w-5 text-[#7aa4c7]" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-[#182533] px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#7aa4c7]" />
              <span className="text-[13px] text-[#7aa4c7]">Conectando...</span>
            </div>
          </div>
        ) : (
          messages.filter(msg => !msg.content.startsWith('[Assunto:')).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-[#182533] px-4 py-2 rounded-xl shadow-sm mb-6 max-w-[280px]">
                <p className="text-[12.5px] text-[#7aa4c7] leading-relaxed">
                  As mensagens enviadas a este chat são seguras. Escolha uma opção abaixo para iniciar.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-[320px]">
                {QUICK_MESSAGES.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(undefined, m.text)}
                    disabled={!conversationId || sending}
                    className="px-4 py-2 rounded-full bg-[#182533] border border-[#2b5278]/20 text-[13px] font-medium text-[#ffffff] hover:bg-[#202b36] active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.filter(msg => !msg.content.startsWith('[Assunto:')).map(msg => {
              // Em produção, admin e cliente terão IDs diferentes. Mas para permitir que você teste com a MESMA conta, 
              // adicionamos um hack: as mensagens do painel admin terminam com um zero-width space invisível (\u200B).
              const isAdminMessage = msg.content.endsWith('\u200B');
              const isMe = msg.sender_id === user?.id && !isAdminMessage;
              const displayContent = msg.content.replace(/\u200B/g, '');
              
              return (
                <div key={msg.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`relative max-w-[85%] px-3 py-2 rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-[#2b5278] rounded-br-[4px] text-[#ffffff]' 
                        : 'bg-[#182533] rounded-bl-[4px] text-[#ffffff]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <p className="text-[15px] leading-[20px] whitespace-pre-wrap pr-10">
                        {displayContent}
                      </p>
                      <div className="flex items-center justify-end gap-1 absolute bottom-1 right-2">
                        <span className={`text-[11px] ${isMe ? 'text-[#7aa4c7]' : 'text-[#547c9e]'}`}>
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

      {/* Input bar estilo Telegram */}
      <div className="px-4 py-3 bg-[#17212b] z-10 pb-6 md:pb-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="flex-1 bg-[#242f3d] rounded-full flex items-center px-4 h-12 shadow-sm">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#ffffff] placeholder:text-[#547c9e]"
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || !conversationId || sending}
            className="w-12 h-12 rounded-full bg-[#2b5278] flex items-center justify-center shrink-0 shadow-sm disabled:opacity-50 active:scale-95 transition-transform"
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
