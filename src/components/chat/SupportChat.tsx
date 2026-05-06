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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      try {
        // Tenta encontrar uma conversa existente para este tópico e usuário
        let { data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('topic', topic)
          .maybeSingle();

        if (!conversation) {
          // Cria uma nova conversa
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({ 
              user_id: user.id, 
              topic, 
              title,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) throw createError;
          conversation = newConv;
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: msgText
      });

      if (error) throw error;

      // Atualiza o timestamp da conversa para ela subir na lista do admin
      await supabase.from('conversations').update({ 
        updated_at: new Date().toISOString() 
      }).eq('id', conversationId);

    } catch (err) {
      console.error("[SupportChat] Erro ao enviar:", err);
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
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50 px-8">
            <UserIcon className="h-12 w-12 mb-4 text-muted-foreground/30" />
            <p className="text-sm font-medium">Olá! Envie uma mensagem para iniciar seu atendimento ou inscrição.</p>
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
        <Button disabled={!newMessage.trim() || !conversationId} type="submit" size="icon" className="rounded-full h-12 w-12 shrink-0 shadow-lg active:scale-95 transition-all">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
