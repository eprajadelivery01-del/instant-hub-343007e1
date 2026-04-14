import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-3 flex items-center">
        <button onClick={() => navigate('/marketplace')} className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        <div className="text-center py-10">
          <div className="h-16 w-16 bg-primary rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg">
            <ShoppingBag className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para fazer pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground ml-1">Email</Label>
            <Input
              id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="seu@email.com"
              className="h-12 rounded-xl bg-card border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground ml-1">Senha</Label>
            <Input
              id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="h-12 rounded-xl bg-card border-border"
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="py-8 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link to="/marketplace/signup" className="text-primary font-semibold">Cadastrar</Link>
        </p>
      </div>
    </div>
  );
}
