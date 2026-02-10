import React, { useState, useMemo } from 'react';
import { ChevronLeft, User as UserIcon, MapPin, Loader2, Save, LogOut, Trophy, Coins, ArrowUpRight } from 'lucide-react';
import { Input, Button } from '../components/UI';
import { useUser } from '../contexts/UserContext';
import { useOrder } from '../contexts/OrderContext';
import { ViewState } from '../types';

const LOYALTY_LEVELS = [
  { name: 'Novo Cliente', emoji: '🌱', minOrders: 0 },
  { name: 'Cliente Frequente', emoji: '☕', minOrders: 3 },
  { name: 'Apreciador', emoji: '⭐', minOrders: 8 },
  { name: 'Conhecedor', emoji: '🧁', minOrders: 15 },
  { name: 'Explorador Gourmet', emoji: '🏅', minOrders: 25 },
  { name: 'Cliente Ouro', emoji: '🥇', minOrders: 40 },
  { name: 'Cliente Diamante', emoji: '💎', minOrders: 60 },
  { name: 'Embaixador Hortal', emoji: '👑', minOrders: 85 },
  { name: 'Lenda da Padaria', emoji: '🌟', minOrders: 120 },
  { name: 'Família Hortal', emoji: '🏠', minOrders: 170 },
];

function getLoyaltyInfo(completedOrders: number) {
  let currentLevel = LOYALTY_LEVELS[0];
  let nextLevel: typeof LOYALTY_LEVELS[0] | null = LOYALTY_LEVELS[1];

  for (let i = LOYALTY_LEVELS.length - 1; i >= 0; i--) {
    if (completedOrders >= LOYALTY_LEVELS[i].minOrders) {
      currentLevel = LOYALTY_LEVELS[i];
      nextLevel = LOYALTY_LEVELS[i + 1] || null;
      break;
    }
  }

  let progress = 100;
  let remaining = 0;
  if (nextLevel) {
    const range = nextLevel.minOrders - currentLevel.minOrders;
    const done = completedOrders - currentLevel.minOrders;
    progress = Math.min(100, Math.round((done / range) * 100));
    remaining = nextLevel.minOrders - completedOrders;
  }

  return { currentLevel, nextLevel, progress, remaining };
}

export const ProfileView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { user, updateUserProfile, logout } = useUser();
  const { orders } = useOrder();

  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed').length, [orders]);
  const loyalty = useMemo(() => getLoyaltyInfo(completedOrders), [completedOrders]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Inicialização do form
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    address: {
      zipCode: user?.address?.zipCode || '',
      street: user?.address?.street || '',
      number: user?.address?.number || '',
      complement: user?.address?.complement || '',
      neighborhood: user?.address?.neighborhood || '',
      city: user?.address?.city || '',
      state: user?.address?.state || ''
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = async (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));

    if (field === 'zipCode') {
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        setIsLoadingCep(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          const data = await response.json();

          if (!data.erro) {
            setFormData((prev: any) => ({
              ...prev,
              address: {
                ...prev.address,
                street: data.logradouro,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf,
              }
            }));
          }
        } catch (error) {
          console.error("Erro ao buscar CEP:", error);
        } finally {
          setIsLoadingCep(false);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    // Simula delay de rede para feedback visual
    await new Promise(resolve => setTimeout(resolve, 800));

    const updatedUser = {
      ...user,
      ...formData
    };
    updateUserProfile(updatedUser);
    setIsLoading(false);
    alert('Dados atualizados com sucesso!');
  };

  const handleLogout = () => {
    if (confirm("Tem certeza que deseja sair?")) {
      logout();
      setCurrentView('shop');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <UserIcon size={48} className="text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-800">Faça Login</h2>
        <p className="text-stone-500 mb-6">Acesse seu perfil para gerenciar seus dados.</p>
        <Button onClick={() => setCurrentView('login')}>Entrar Agora</Button>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-32">
      <div className="bg-white p-4 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-stone-100 rounded-full">
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <h1 className="text-lg font-bold text-stone-800 leading-none">Meu Perfil</h1>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Sair da Conta"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Nova Seção de Fidelidade */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 rounded-[2.5rem] shadow-2xl shadow-brand-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-brand-200 text-[10px] font-black uppercase tracking-[0.2em]">Nível de Fidelidade</span>
                <h3 className="text-white text-2xl font-black mt-1 flex items-center gap-2">
                  {loyalty.currentLevel.name} <span>{loyalty.currentLevel.emoji}</span>
                </h3>
              </div>
              <div className="bg-white/20 backdrop-blur-md p-2 rounded-2xl">
                <Coins size={24} className="text-amber-300" />
              </div>
            </div>

            <div className="mt-8">
              {loyalty.nextLevel ? (
                <>
                  <div className="flex justify-between text-[11px] font-bold text-brand-100 mb-2">
                    <span>Progresso para Próximo Nível</span>
                    <span>{loyalty.progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-500" style={{ width: `${loyalty.progress}%` }}></div>
                  </div>
                  <p className="text-[10px] text-brand-200 mt-3 font-medium">
                    {loyalty.remaining === 1
                      ? <>Falta apenas <span className="text-white font-bold">1 pedido</span> para você se tornar </>
                      : <>Faltam apenas <span className="text-white font-bold">{loyalty.remaining} pedidos</span> para você se tornar </>
                    }
                    <span className="text-white font-bold">{loyalty.nextLevel.name} {loyalty.nextLevel.emoji}</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="w-full h-3 bg-amber-400/50 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-amber-400 w-full rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                  </div>
                  <p className="text-[10px] text-brand-200 mt-3 font-medium">Você alcançou o nível máximo! <span className="text-white font-bold">Você faz parte da Família Hortal! 🏠</span></p>
                </>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
              <div>
                <span className="text-brand-200 text-[9px] font-bold uppercase tracking-wider">Saldo de Cashback</span>
                <p className="text-white text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user.cashbackBalance || 0)}</p>
              </div>
              <button
                onClick={() => setCurrentView('shop')}
                className="bg-white text-brand-700 px-4 py-2.5 rounded-2xl font-black text-[10px] flex items-center gap-2 hover:bg-brand-50 transition-all active:scale-95"
              >
                Usar Agora <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserIcon className="text-brand-500" size={20} />
            <h3 className="font-bold text-stone-800">Dados Pessoais</h3>
          </div>

          <Input
            label="Nome Completo"
            value={formData.name}
            onChange={(e: any) => handleInputChange('name', e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              label="Telefone (Opcional)"
              value={formData.phone}
              onChange={(e: any) => handleInputChange('phone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="E-mail"
              value={formData.email}
              onChange={(e: any) => handleInputChange('email', e.target.value)}
              readOnly={true}
              className="opacity-70 bg-stone-50 cursor-not-allowed"
            />
          </div>
          <Input
            label="CPF"
            value={formData.cpf}
            onChange={(e: any) => handleInputChange('cpf', e.target.value)}
          />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="text-brand-500" size={20} />
            <h3 className="font-bold text-stone-800">Endereço de Entrega</h3>
          </div>

          <div className="flex gap-3">
            <div className="w-1/3">
              <Input
                label="CEP"
                value={formData.address.zipCode}
                onChange={(e: any) => handleAddressChange('zipCode', e.target.value)}
                placeholder="00000000"
                maxLength={9}
                icon={isLoadingCep ? <Loader2 className="animate-spin text-brand-500" size={18} /> : null}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Cidade"
                value={formData.address.city}
                onChange={(e: any) => handleAddressChange('city', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Rua"
                value={formData.address.street}
                onChange={(e: any) => handleAddressChange('street', e.target.value)}
              />
            </div>
            <div className="w-1/4">
              <Input
                label="Nº"
                value={formData.address.number}
                onChange={(e: any) => handleAddressChange('number', e.target.value)}
              />
            </div>
          </div>

          <Input
            label="Complemento"
            value={formData.address.complement}
            onChange={(e: any) => handleAddressChange('complement', e.target.value)}
            placeholder="Apto, Bloco, etc."
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Bairro"
                value={formData.address.neighborhood}
                onChange={(e: any) => handleAddressChange('neighborhood', e.target.value)}
              />
            </div>
            <div className="w-1/4">
              <Input
                label="UF"
                value={formData.address.state}
                onChange={(e: any) => handleAddressChange('state', e.target.value)}
                maxLength={2}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100" isLoading={isLoading}>
          <Save size={18} /> Salvar Alterações
        </Button>
      </div>
    </div>
  );
};