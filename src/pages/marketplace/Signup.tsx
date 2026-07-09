import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { toast.error('Aceite os termos para continuar'); return; }
    if (password !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
      toast.error('Por favor, insira um número de telefone válido com DDD (ex: 11999999999)');
      return;
    }
    
    setLoading(true);
    try {
      await signUp(email, password, fullName, phone);
      toast.success('Conta criada!');
      navigate('/marketplace');
    } catch (err: any) {
      if (err.message === 'User already registered') {
        toast.error('Este e-mail já está em uso.');
      } else {
        toast.error(err.message || 'Erro ao cadastrar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/marketplace/login')} className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        <div className="text-center py-6">
          <div className="h-16 w-16 bg-primary rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/icon.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Preencha seus dados para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 flex-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground ml-1">Nome completo</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="João Silva" className="h-12 rounded-xl bg-card border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground ml-1">Telefone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(11) 99999-9999" className="h-12 rounded-xl bg-card border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground ml-1">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="h-12 rounded-xl bg-card border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground ml-1">Senha</Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={6} 
                placeholder="Mínimo 6 caracteres" 
                className="h-12 rounded-xl bg-card border-border pr-10" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground ml-1">Confirmar senha</Label>
            <div className="relative">
              <Input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                minLength={6} 
                placeholder="Repita sua senha" 
                className="h-12 rounded-xl bg-card border-border pr-10" 
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-3 px-1 py-3">
            <input
              type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              Li e concordo com os{' '}
              <Link to="/marketplace/terms" className="text-primary font-medium">Termos de Uso</Link>
              {' '}e a{' '}
              <Link to="/marketplace/privacy" className="text-primary font-medium">Política de Privacidade</Link>.
            </Label>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold mt-2" disabled={loading || !acceptedTerms}>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>

        <p className="py-8 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/marketplace/login" className="text-primary font-semibold">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
