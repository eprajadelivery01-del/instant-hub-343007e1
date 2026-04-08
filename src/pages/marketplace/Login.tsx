import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpeg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/marketplace');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/marketplace')} className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 border border-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        {/* Logo Section */}
        <div className="text-center py-10">
          <div className="h-20 w-20 bg-primary rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-primary/20 transform rotate-3">
             <ShoppingBag className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bem-vindo de volta!</h1>
          <p className="text-sm text-slate-500 font-medium mt-2">Acesse sua conta para fazer pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="h-14 rounded-2xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-bold text-slate-700 ml-1">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="h-14 rounded-2xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" className="w-full h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/20" disabled={loading}>
            {loading ? 'Sincronizando...' : 'Entrar na conta'}
          </Button>
        </form>
        <p className="py-8 text-center text-sm text-slate-500 font-medium">
          Ainda não tem conta?{' '}
          <Link to="/marketplace/signup" className="text-primary font-black hover:opacity-80 decoration-2 transition-all">
            Cadastrar agora
          </Link>
        </p>
        {/* Global Branding Footer */}
        <div className="w-full py-6 mt-auto flex justify-center opacity-10 pointer-events-none select-none">
          <p className="text-[10px] font-black tracking-[0.3em] text-muted-foreground/50 uppercase">
            BONASOFT
          </p>
        </div>
      </div>
    </div>
  );
}
