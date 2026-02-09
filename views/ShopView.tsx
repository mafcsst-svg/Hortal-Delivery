import React, { useState, useMemo } from 'react';
import { Store, Coins, Search, Plus, Minus, LogIn, MessageSquare } from 'lucide-react';
import { APP_NAME, APP_SUBTITLE } from '../constants';
import { Product, ProductCategory, ViewState } from '../types';
import { useUser } from '../contexts/UserContext';
import { useProducts } from '../contexts/ProductContext';
import { useOrder } from '../contexts/OrderContext';

const ProductRow = ({ product, cart, addToCart, updateCartQuantity, updateObservation }: any) => {
  const cartItem = cart.find((item: any) => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const [showObs, setShowObs] = useState(!!cartItem?.observation);

  return (
    <div className="px-4 pb-2">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex gap-4 relative group">
        <div className="flex-1 flex flex-col">
          <h3 className="font-bold text-stone-800 text-base leading-tight mb-1 line-clamp-1">{product.name}</h3>
          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed flex-1">{product.description}</p>

          <div className="mt-3 flex items-center gap-2">
            <span className="font-bold text-stone-900 text-base">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</span>
            {product.oldPrice && (
              <span className="text-xs text-stone-400 line-through">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.oldPrice)}</span>
            )}
          </div>
        </div>

        <div className="w-24 h-24 relative flex-shrink-0">
          <img
            src={product.image}
            className="w-full h-full rounded-xl object-cover bg-stone-100"
            alt={product.name}
          />

          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            {quantity === 0 ? (
              <button
                onClick={() => addToCart(product, 1)}
                className="bg-white text-brand-500 border border-stone-200 px-6 py-1 rounded-lg flex items-center justify-center font-bold text-sm shadow-md active:scale-95 transition-all hover:border-brand-200"
              >
                <Plus size={16} className="mr-1" /> Adicionar
              </button>
            ) : (
              <div className="flex items-center bg-white rounded-lg shadow-md border border-stone-200 overflow-hidden">
                <button onClick={() => updateCartQuantity(product.id, -1)} className="p-1.5 text-brand-500 hover:bg-stone-50 transition-colors"><Minus size={16} /></button>
                <span className="px-3 text-sm font-bold text-stone-800 min-w-[2rem] text-center">{quantity}</span>
                <button onClick={() => updateCartQuantity(product.id, 1)} className="p-1.5 text-brand-500 hover:bg-stone-50 transition-colors"><Plus size={16} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChefSuggestionBanner = ({ setCategory }: { setCategory: (c: any) => void }) => {
  const [hour, setHour] = useState(new Date().getHours());

  // Update hour periodically in case the user keeps the app open
  React.useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(timer);
  }, []);

  let config = {
    title: "Sugestão do \nChef Hortal 👨‍🍳",
    subtitle: "Destaque do Dia",
    description: "Experimente nosso Pão Italiano Rústico, fornada fresquinha saindo agora.",
    buttonText: "Ver todos os pães",
    category: 'panificacao',
    gradient: "from-stone-900 to-stone-800",
    shadowColor: "shadow-stone-900/50",
    accent: "text-brand-400",
    buttonColor: "bg-brand-500",
    iconColor: "text-white/20"
  };

  if (hour >= 6 && hour < 12) {
    // Morning (06:00 - 11:59)
    config = {
      title: "Café da Manhã \nCompleto ☕",
      subtitle: "Comece bem o dia",
      description: "Nada como um Combo de Pão de Queijo quentinho com Capuccino para dar energia!",
      buttonText: "Ver Promoções",
      category: 'promocoes',
      gradient: "from-amber-500 to-orange-600",
      shadowColor: "shadow-orange-500/40",
      accent: "text-white",
      buttonColor: "bg-white text-orange-600 hover:bg-orange-50",
      iconColor: "text-white/20"
    };
  } else if (hour >= 12 && hour < 18) {
    // Afternoon (12:00 - 17:59)
    config = {
      title: "Tarde Doce \ncom Bolo 🍰",
      subtitle: "Hora do Lanche",
      description: "Nosso Bolo de Cenoura com Chocolate acabou de sair do forno. Irresistível!",
      buttonText: "Ir para Confeitaria",
      category: 'confeitaria',
      gradient: "from-pink-500 to-rose-600",
      shadowColor: "shadow-rose-500/40",
      accent: "text-white",
      buttonColor: "bg-white text-rose-600 hover:bg-rose-50",
      iconColor: "text-white/20"
    };
  } else {
    // Night (18:00 - 05:59)
    config = {
      title: "Fome de Leão? \nX-Salada! 🍔",
      subtitle: "Jantar Especial",
      description: "Mate sua fome com nosso X-Salada no Pão Francês. Saboroso e caprichado.",
      buttonText: "Pedir Lanche",
      category: 'lanches',
      gradient: "from-indigo-600 to-purple-800",
      shadowColor: "shadow-indigo-500/40",
      accent: "text-indigo-200",
      buttonColor: "bg-white text-indigo-700 hover:bg-indigo-50",
      iconColor: "text-white/10"
    };
  }

  return (
    <div className="px-4 mb-8">
      <div className={`bg-gradient-to-br ${config.gradient} rounded-[2rem] p-6 relative overflow-hidden shadow-2xl ${config.shadowColor} animate-pulse-slow`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse"></div>

        <div className="relative z-10">
          <span className={`${config.accent} text-[10px] font-black uppercase tracking-[0.3em] bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm`}>{config.subtitle}</span>
          <h2 className="text-white text-2xl font-black mt-3 leading-tight whitespace-pre-line drop-shadow-lg">{config.title}</h2>
          <p className="text-white/90 text-sm mt-3 leading-relaxed max-w-[220px] font-medium drop-shadow-md">{config.description}</p>
          <button
            onClick={() => setCategory(config.category)}
            className={`mt-6 ${config.buttonColor} px-6 py-3 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-lg flex items-center gap-2 group`}
          >
            {config.buttonText}
          </button>
        </div>

        <div className={`absolute bottom-0 right-0 w-48 h-48 pointer-events-none transform translate-x-10 translate-y-10 ${config.iconColor}`}>
          <Store size={180} />
        </div>
      </div>
    </div>
  );
};

export const ShopView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { user } = useUser();
  const { products, categories } = useProducts();
  const { cart, addToCart, updateCartQuantity, updateObservation } = useOrder();

  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      if (p.active === false) return false;
      const matchesCategory = category === 'all' || p.category === category;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, searchTerm, products]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="h-screen flex flex-col bg-stone-50 pb-[80px]">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 flex-shrink-0 border-b border-stone-100 shadow-sm">
        <div className="p-4 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-100 rotate-3 transform hover:rotate-0 transition-transform duration-300">
              <Store size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900 leading-none tracking-tight">{APP_NAME}</h1>
              <p className="text-[10px] text-brand-600 font-black uppercase tracking-[0.2em] mt-1">{APP_SUBTITLE}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 text-brand-700 rounded-2xl hover:bg-brand-100 transition-all border border-brand-100 shadow-sm font-bold text-xs active:scale-95"
            >
              <MessageSquare size={16} className="text-brand-500" /> <span className="hidden xs:inline">Chef Hortal</span>
            </button>

            {!user ? (
              <button
                onClick={() => setCurrentView('login')}
                className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 active:scale-95"
              >
                <LogIn size={16} /> Entrar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-stone-900 leading-none">{user.name}</p>
                  <p className="text-[8px] text-brand-600 font-bold">{formatCurrency(user.cashbackBalance)}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-100 border-2 border-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2 bg-brand-50/50 flex items-center justify-between border-y border-brand-100/50">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-800">Olá, <span className="text-brand-600 font-black">{user.name.split(' ')[0]}</span></span>
              </div>
              <div className="flex items-center gap-1.5 bg-white text-brand-700 px-3 py-1.5 rounded-xl border border-brand-100 shadow-sm">
                <Coins size={14} className="text-amber-500 fill-amber-500" />
                <span className="text-[11px] font-black">{formatCurrency(user.cashbackBalance || 0)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-[11px] text-stone-500 font-medium">✨ Bem-vindo(a) à nossa padaria artesanal!</span>
              <span className="text-[9px] bg-brand-500 text-white px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">Cashback Ativado</span>
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-500 transition-colors" />
            <input
              type="text"
              placeholder="Encontre seu pão favorito..."
              className="w-full bg-stone-100 border border-stone-200 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-50 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-semibold transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 px-4">
          {categories.filter(c => c.active).map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs whitespace-nowrap font-black transition-all border-2 flex items-center gap-2 ${category === c.id ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-100 -translate-y-0.5' : 'bg-white text-stone-500 border-stone-100 hover:border-brand-200 hover:bg-stone-50'}`}
            >
              <span>{c.emoji}</span>
              {c.name}
            </button>
          ))}
          <button
            key="all"
            onClick={() => setCategory('all')}
            className={`px-5 py-2.5 rounded-2xl text-xs whitespace-nowrap font-black transition-all border-2 flex items-center gap-2 ${category === 'all' ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-100 -translate-y-0.5' : 'bg-white text-stone-500 border-stone-100 hover:border-brand-200 hover:bg-stone-50'}`}
          >
            <span>🏠</span>
            Início
          </button>
        </div>
      </div>

      <div className="flex-1 w-full bg-stone-50 overflow-y-auto pt-4 pb-40">
        {category === 'all' && searchTerm === '' && (
          <ChefSuggestionBanner setCategory={setCategory} />
        )}

        <div className="px-4 mb-4 flex items-center justify-between">
          <h2 className="font-black text-stone-900 text-lg">
            {category === 'all' ? 'Nossos Produtos' : 'Explorando Categoria'}
          </h2>
          <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg border border-brand-100 uppercase tracking-widest">
            {filteredProducts.length} Itens
          </span>
        </div>

        {filteredProducts.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            cart={cart}
            addToCart={addToCart}
            updateCartQuantity={updateCartQuantity}
            updateObservation={updateObservation}
          />
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-[85px] left-0 w-full px-4 z-40">
          <button
            onClick={() => setCurrentView('cart')}
            className="w-full bg-stone-900 text-white p-5 rounded-[2rem] shadow-2xl flex justify-between items-center font-bold active:scale-95 transition-all hover:bg-stone-800 animate-slide-up border border-stone-800"
          >
            <div className="flex items-center gap-4">
              <div className="bg-brand-500 w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black border-2 border-stone-900 text-white">
                {cartItemCount}
              </div>
              <div>
                <span className="text-base font-black block leading-none">Minha Cesta</span>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Finalizar Pedido</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xl font-black text-brand-400">{formatCurrency(cartTotal)}</span>
            </div>
          </button>
        </div>
      )}

      {/* Chef Hortal FAB */}
      <div className="fixed bottom-28 right-6 z-40">
        <button
          onClick={() => setCurrentView('chat')}
          className="group flex items-center gap-3 bg-brand-500 text-white p-4.5 rounded-full shadow-2xl hover:bg-brand-600 transition-all active:scale-95 animate-soft-fade border-4 border-white overflow-hidden"
        >
          <div className="relative">
            <MessageSquare size={26} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-brand-500 animate-pulse"></div>
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black text-sm whitespace-nowrap">
            Falar com Chef Hortal
          </span>
        </button>
      </div>
    </div>
  );
};