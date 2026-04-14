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
  message: string;
  created_at: string;
}

export function SupportChat({ topic, title, companyId = null }: SupportChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      // Find existing session or create a new one
      let { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('customer_id', user.id)
        .eq('topic', topic)
        .eq('status', 'open')
        .maybeSingle();

      if (!session) {
        // Create new session via RPC or direct insert (assuming permissions allow)
        const { data: newSession } = await supabase
          .from('chat_sessions')
          .insert({ customer_id: user.id, topic, company_id: companyId })
          .select()
          .single();
        session = newSession;
      }

      if (session) {
        setSessionId(session.id);
        const { data: history } = await supabase
          .from('chat_message_logs')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (history) setMessages(history);

        // Subscription
        const channel = supabase.channel(`support_chat_${session.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message_logs', filter: `session_id=eq.${session.id}` }, payload => {
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
    };

    initializeChat();
  }, [user, topic, companyId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !sessionId) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    // Optimistic UI could go here, but let's rely on DB realtime
    await supabase.from('chat_message_logs').insert({
      session_id: sessionId,
      sender_id: user.id,
      message: msgText
    });
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
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <p className="text-sm">Envie a primeira mensagem para iniciar o atendimento.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className={`p-3 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}>
                  <p className="text-sm">{msg.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
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
          className="flex-1 rounded-full bg-background"
        />
        <Button disabled={!newMessage.trim() || !sessionId} type="submit" size="icon" className="rounded-full shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
