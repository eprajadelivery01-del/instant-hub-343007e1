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
  return (
    <div className="flex flex-col h-full bg-background items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <Loader2 className="h-10 w-10 text-muted-foreground opacity-50" />
      </div>
      <h3 className="text-2xl font-black mb-3">Suporte Indisponível</h3>
      <p className="text-sm text-muted-foreground font-medium max-w-[280px]">
        O chat está passando por atualizações no servidor. Por favor, utilize os nossos canais alternativos (WhatsApp) por enquanto.
      </p>
    </div>
  );
}
