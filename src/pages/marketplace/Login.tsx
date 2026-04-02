import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-[hsl(220,25%,6%)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/marketplace')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="text-center py-8">
          <img src={logo} alt="É Pra Já Delivery" className="mx-auto h-20 w-auto rounded-2xl mb-4" />
          <h1 className="text-2xl font-extrabold text-white">Bem-vindo de volta!</h1>
          <p className="text-sm text-white/60 mt-1">Entre para fazer seus pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-white/80">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="h-12 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-white/80">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="h-12 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="py-6 text-center text-sm text-white/50">
          Não tem conta?{' '}
          <Link to="/marketplace/signup" className="text-primary hover:underline font-bold">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
