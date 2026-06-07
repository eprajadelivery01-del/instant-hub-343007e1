import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="app-shell min-h-screen flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/marketplace')} className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        <div className="text-center py-10">
          <div className="h-16 w-16 bg-primary rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/icon.png" alt="Logo" className="w-full h-full object-cover" />
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
            <div className="relative">
              <Input
                id="password" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
                placeholder="••••••••"
                className="h-12 rounded-xl bg-card border-border pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="py-8 space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link to="/marketplace/signup" className="text-primary font-semibold">Cadastrar</Link>
          </p>
          <div className="flex justify-center gap-6">
            <Link to="/marketplace/privacy" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors">
              Privacidade
            </Link>
            <Link to="/marketplace/terms" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors">
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
