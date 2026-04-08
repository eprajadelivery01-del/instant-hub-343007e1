import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpeg';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, fullName, phone);
      toast.success('Conta criada com sucesso!');
      navigate('/marketplace');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/marketplace/login')} className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 border border-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        <div className="text-center py-6">
          <div className="h-20 w-20 bg-primary rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-primary/20 transform -rotate-3">
             <ShoppingBag className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Criar conta</h1>
          <p className="text-sm text-slate-500 font-medium mt-2">Preencha seus dados para começar a pedir</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 flex-1">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-bold text-slate-700 ml-1">Nome completo</Label>
            <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="João Silva" className="h-14 rounded-2xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-bold text-slate-700 ml-1">Telefone</Label>
            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(11) 99999-9999" className="h-14 rounded-2xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="h-14 rounded-2xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-bold text-slate-700 ml-1">Senha</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" className="h-14 rounded-2xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
          </div>
          <Button type="submit" className="w-full h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/20 mt-4" disabled={loading}>
            {loading ? 'Preparando tudo...' : 'Criar minha conta'}
          </Button>
        </form>

        <p className="py-8 text-center text-sm text-slate-500 font-medium">
          Já tem uma conta?{' '}
          <Link to="/marketplace/login" className="text-primary font-black hover:opacity-80 transition-all">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
