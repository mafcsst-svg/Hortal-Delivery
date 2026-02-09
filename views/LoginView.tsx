import React, { useState } from 'react';
import { Store, User as UserIcon, Mail, Lock, Phone, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Button, Input } from '../components/UI';
import { APP_NAME } from '../constants';
import { useUser } from '../contexts/UserContext';
import { ViewState } from '../types';

export const LoginView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { setUser } = useUser();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', cpf: '' });

  const getFriendlyErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'invalid_credentials': return 'E-mail ou senha incorretos.';
      case 'email_not_confirmed': return 'Por favor, confirme seu e-mail.';
      case 'user_already_exists': return 'Este e-mail já está cadastrado.';
      case 'weak_password': return 'A senha deve ter pelo menos 6 caracteres.';
      case 'invalid_email': return 'E-mail inválido.';
      default: return 'Ocorreu um erro ao conectar. Tente novamente.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              cpf: formData.cpf
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user && data.session) {
          setCurrentView('shop');
        } else {
          setError('Verifique seu e-mail para confirmar o cadastro.');
        }
      } else {
        console.log("Tentando login com:", formData.email);
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        console.log("Resposta do Supabase Auth:", { data, signInError });

        if (signInError) throw signInError;

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (profile?.role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('shop');
          }
        }
      }
    } catch (err: any) {
      console.error("Supabase Auth Error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message || 'unknown'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-between p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-brand-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <button
        onClick={() => setCurrentView('shop')}
        className="absolute top-6 right-6 p-2 bg-stone-800/50 rounded-full text-stone-400 hover:text-white hover:bg-stone-700/50 transition-all z-20 backdrop-blur-md border border-stone-700"
        title="Continuar sem login"
      >
        <X size={24} />
      </button>

      <div className="z-10 w-full max-w-sm flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-stone-800 rounded-2xl mx-auto flex items-center justify-center mb-6 border border-stone-700"><Store size={40} className="text-brand-500" /></div>
          <h1 className="text-3xl font-bold">{APP_NAME}</h1>
          <p className="text-stone-400">{isRegistering ? 'Crie sua conta' : 'Acesse sua conta'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-stone-800/50 p-6 rounded-3xl backdrop-blur-sm border border-stone-700/50">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {isRegistering && <Input placeholder="Nome Completo" icon={<UserIcon size={18} />} value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />}
          <Input placeholder="E-mail" type="email" icon={<Mail size={18} />} value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
          <Input placeholder="Senha" type="password" icon={<Lock size={18} />} value={formData.password} onChange={(e: any) => setFormData({ ...formData, password: e.target.value })} />

          <Button type="submit" className="w-full mt-2 bg-brand-500 hover:bg-brand-600" isLoading={isLoading}>{isRegistering ? 'Cadastrar' : 'Entrar'}</Button>
        </form>
        <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="w-full text-center mt-6 text-sm text-stone-400 hover:text-white transition-colors">
          {isRegistering ? 'Já tem conta? Entrar' : 'Não tem conta? Registre-se'}
        </button>
      </div>
      <div className="z-10 w-full text-center py-6 mt-8 border-t border-stone-800/50 text-xs text-stone-500">
        Padaria Hortal<br />
        Rua Francisco de almeida, 218 - Jd Santo Antônio<br />
        Bebedouro SP<br />
        <span className="flex items-center justify-center gap-1 mt-1"><Phone size={12} /> (17) 99253-7394</span>
      </div>
    </div>
  );
};
