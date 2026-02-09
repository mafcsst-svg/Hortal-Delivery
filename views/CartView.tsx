import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ShoppingBag, Truck, MapPin, Store, Phone,
  QrCode, Banknote, CreditCard, Copy, Minus, Plus, Coins,
  CreditCard as CardIcon, Apple, UtensilsCrossed, AlertCircle, ArrowRight, LogIn
} from 'lucide-react';
import { Button, Input } from '../components/UI';
import { useUser } from '../contexts/UserContext';
import { useOrder } from '../contexts/OrderContext';
import { ViewState, Order, Address } from '../types';
import { supabase } from '../services/supabaseClient';

export const CartView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { user, updateUserProfile, settings } = useUser();
  const { cart, setCart, setEarnedCashback, updateCartQuantity, refreshOrders } = useOrder();

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'money' | 'card'>('pix');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [cashGiven, setCashGiven] = useState('');
  const [cardType, setCardType] = useState<string | null>(null);
  const [useCashback, setUseCashback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const currentDeliveryFee = fulfillmentMethod === 'delivery' ? settings.deliveryFee : 0;

  const cashbackDiscount = useCashback ? Math.min(subtotal + currentDeliveryFee, user?.cashbackBalance || 0) : 0;
  const total = Math.max(0, subtotal + currentDeliveryFee - cashbackDiscount);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const hasSomeAddress = useMemo(() => {
    const addr = user?.address;
    return !!(addr?.street || addr?.zipCode || addr?.city);
  }, [user]);

  const isAddressComplete = useMemo(() => {
    const addr = user?.address;
    return !!(addr?.street && addr?.number && addr?.city && addr?.zipCode);
  }, [user]);

  const handleFinishOrder = async () => {
    if (!user) {
      setCurrentView('login');
      return;
    }

    setIsLoading(true);
    const earned = !useCashback ? subtotal * settings.cashbackPercentage : 0;

    try {
      // 1. Create the Order in Supabase
      const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          customer_name: user.name,
          customer_phone: user.phone,
          address: user.address,
          subtotal,
          delivery_fee: currentDeliveryFee,
          total,
          payment_method: paymentMethod,
          payment_detail: paymentMethod === 'money' ? `Troco para ${cashGiven}` : (cardType || ''),
          status: 'received',
          delivery_code: deliveryCode,
          cashback_earned: earned
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        observation: item.observation || '',
        image: item.image
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Update User Cashback
      const finalBalance = (user.cashbackBalance || 0) - cashbackDiscount + earned;
      await updateUserProfile({
        ...user,
        cashbackBalance: finalBalance
      });

      // 4. Cleanup and redirect
      setCart([]);
      setEarnedCashback(earned);

      // Fast Sync: Notify Admin via Broadcast
      const syncChannel = supabase.channel('orders-sync');
      syncChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await syncChannel.send({
            type: 'broadcast',
            event: 'new_order',
            payload: { orderId: orderData.id }
          });
          console.log('Instant Order Broadcast Sent via orders-sync!');
          // Cleanup ephemeral channel
          setTimeout(() => supabase.removeChannel(syncChannel), 5000);
        }
      });

      await refreshOrders();
      setCurrentView('order-success');
    } catch (err: any) {
      console.error('Error finishing order:', err);
      // alert code could be here but handled by UI usually
    } finally {
      setIsLoading(false);
    }
  };

  const renderPaymentContent = () => {
    if (total <= 0) return (
      <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-green-700 text-center animate-fade-in">
        <p className="font-bold">Pedido 100% pago com cashback!</p>
      </div>
    );
    if (paymentMethod === 'pix') {
      const pixPayload = "00020126360014br.gov.bcb.pix..."; // Simplificado para demo
      return (
        <div className="bg-white p-4 rounded-xl border border-stone-100 flex flex-col items-center space-y-4 animate-fade-in">
          <div className="text-center">
            <p className="text-xs text-stone-500 uppercase font-bold tracking-wider mb-2">Escaneie o QR Code</p>
            <div className="bg-white p-2 rounded-lg border-2 border-dashed border-stone-200 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`}
                alt="QR Code Pix"
                className="w-48 h-48"
              />
            </div>
          </div>
          <div className="w-full">
            <p className="text-xs text-stone-500 text-center mb-2">Ou copie o código abaixo:</p>
            <div className="flex gap-2">
              <input readOnly value={pixPayload} className="flex-1 bg-stone-50 text-xs p-2 rounded border border-stone-200 text-stone-500 truncate" />
              <button onClick={() => navigator.clipboard.writeText(pixPayload)} className="bg-stone-200 p-2 rounded text-stone-600 hover:bg-stone-300">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (paymentMethod === 'money') {
      const cashValue = parseFloat(cashGiven.replace(',', '.')) || 0;
      const change = cashValue - total;
      return (
        <div className="bg-white p-4 rounded-xl border border-stone-100 space-y-4 animate-fade-in">
          <Input label="Valor Entregue (R$)" placeholder="0,00" type="number" value={cashGiven} onChange={(e: any) => setCashGiven(e.target.value)} icon={<Banknote size={18} />} />
          <div className={`p-4 rounded-xl flex justify-between items-center ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span className="font-bold text-sm">Troco estimado:</span>
            <span className="font-bold text-lg">{change >= 0 ? formatCurrency(change) : 'Falta valor'}</span>
          </div>
        </div>
      );
    }
    if (paymentMethod === 'card') {
      const options = [
        { id: 'debito', label: 'Débito', icon: <CardIcon size={20} /> },
        { id: 'credito', label: 'Crédito', icon: <CardIcon size={20} /> },
        { id: 'alimentacao', label: 'Alimentação', icon: <Apple size={20} /> },
        { id: 'refeicao', label: 'Refeição', icon: <UtensilsCrossed size={20} /> },
      ];

      return (
        <div className="bg-white p-4 rounded-xl border border-stone-100 space-y-3 animate-fade-in">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest text-center mb-2">Pagar com cartão na entrega</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setCardType(opt.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${cardType === opt.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'}`}
              >
                {opt.icon}
                <span className="text-xs font-bold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-stone-200 rounded-full flex items-center justify-center text-stone-400 mb-4"><ShoppingBag size={40} /></div>
        <h2 className="text-xl font-bold text-stone-800">Sua cesta está vazia</h2>
        <Button onClick={() => setCurrentView('shop')} variant="secondary" className="mt-4">Voltar ao Cardápio</Button>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-24">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft size={24} className="text-stone-600" /></button>
        <h1 className="text-lg font-bold text-stone-800">Finalizar Pedido</h1>
      </div>
      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">Itens do Pedido</h2>
          {cart.map((item) => (
            <div key={item.id} className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-stone-100 px-2 py-1 rounded text-xs font-bold text-stone-600">{item.quantity}x</span>
                <div>
                  <p className="text-sm font-bold text-stone-800">{item.name}</p>
                  <p className="text-xs text-stone-500">{formatCurrency(item.price * item.quantity)}</p>
                  {item.observation && <p className="text-[10px] text-brand-500 italic mt-0.5">Obs: {item.observation}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-stone-400 hover:text-brand-500"><Minus size={16} /></button>
                <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-stone-400 hover:text-green-500"><Plus size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-100 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="text-amber-500" size={20} />
              <div>
                <h3 className="text-sm font-bold text-stone-800 leading-tight">Cashback</h3>
                <p className="text-[10px] text-stone-500">Saldo disponível: <span className="font-bold">{formatCurrency(user?.cashbackBalance || 0)}</span></p>
              </div>
            </div>
            {user ? (
              <button
                onClick={() => setUseCashback(!useCashback)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${useCashback ? 'bg-brand-500' : 'bg-stone-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useCashback ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            ) : (
              <span className="text-[10px] text-stone-400 font-medium">Faça login para usar</span>
            )}
          </div>
          {useCashback && (
            <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-medium border border-amber-100 flex justify-between">
              <span>Desconto aplicado:</span>
              <span>- {formatCurrency(cashbackDiscount)}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">Como deseja receber?</h2>
          <div className="flex p-1 bg-stone-200 rounded-2xl">
            <button
              onClick={() => setFulfillmentMethod('delivery')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${fulfillmentMethod === 'delivery' ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <Truck size={18} /> Entrega
            </button>
            <button
              onClick={() => setFulfillmentMethod('pickup')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${fulfillmentMethod === 'pickup' ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <ShoppingBag size={18} /> Retirada
            </button>
          </div>

          {fulfillmentMethod === 'delivery' ? (
            <div className="bg-white p-4 rounded-2xl border border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                  <MapPin size={16} className="text-brand-500" /> Endereço de Entrega
                </h3>
                {user && <button onClick={() => setCurrentView('profile')} className="text-xs font-bold text-brand-500 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">Editar</button>}
              </div>
              {user ? (
                hasSomeAddress ? (
                  <div className="text-sm text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 relative overflow-hidden">
                    {!isAddressComplete && (
                      <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-2 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle size={10} /> Incompleto
                      </div>
                    )}
                    <p className="font-bold text-stone-700">
                      {user.address?.street || <span className="text-red-400 italic">Rua não informada</span>},
                      {' '}
                      {user.address?.number || <span className="text-red-400 italic">S/N</span>}
                    </p>
                    <p>{user.address?.neighborhood} - {user.address?.city}/{user.address?.state}</p>
                    <p className="text-xs mt-1 text-stone-400">CEP: {user.address?.zipCode}</p>

                    {!isAddressComplete && (
                      <button onClick={() => setCurrentView('profile')} className="mt-2 text-xs text-red-500 font-bold underline">
                        Clique para completar o endereço
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl space-y-3 animate-pulse">
                    <div className="flex gap-2 text-brand-500">
                      <AlertCircle size={20} className="flex-shrink-0" />
                      <p className="text-xs font-bold">Endereço Incompleto!</p>
                    </div>
                    <p className="text-xs text-brand-500">Cadastre seu endereço para que possamos realizar a entrega do seu pedido.</p>
                    <Button onClick={() => setCurrentView('profile')} className="w-full py-2 text-xs bg-brand-500 hover:bg-brand-600 shadow-none">
                      Cadastrar Endereço <ArrowRight size={14} />
                    </Button>
                  </div>
                )
              ) : (
                <div className="p-6 bg-stone-50 border border-stone-100 rounded-xl flex flex-col items-center justify-center text-center">
                  <MapPin size={32} className="text-stone-300 mb-2" />
                  <p className="text-sm text-stone-500 mb-3">Faça login para selecionar seu endereço de entrega.</p>
                  <Button onClick={() => setCurrentView('login')} className="w-full text-xs" variant="secondary">Entrar Agora</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-stone-100 space-y-2">
              <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Store size={16} className="text-brand-500" /> Local de Retirada
              </h3>
              <div className="text-sm text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                <p className="font-bold text-stone-700">Padaria Hortal</p>
                <p>Rua Francisco de almeida, 218</p>
                <p>Jd Santo Antônio - Bebedouro SP</p>
                <p className="flex items-center gap-1 mt-1 text-brand-500 font-medium"><Phone size={14} /> (17) 99253-7394</p>
                <p className="text-[10px] mt-2 text-green-600 font-bold uppercase tracking-wider">Pronto em 20-30 min</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1 mb-2">Forma de Pagamento</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button disabled={total <= 0} onClick={() => setPaymentMethod('pix')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all disabled:opacity-30 ${paymentMethod === 'pix' && total > 0 ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
              <QrCode size={20} className="mb-1" /><span className="text-[10px] font-bold">PIX</span>
            </button>
            <button disabled={total <= 0} onClick={() => setPaymentMethod('money')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all disabled:opacity-30 ${paymentMethod === 'money' && total > 0 ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
              <Banknote size={20} className="mb-1" /><span className="text-[10px] font-bold">Dinheiro</span>
            </button>
            <button disabled={total <= 0} onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all disabled:opacity-30 ${paymentMethod === 'card' && total > 0 ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
              <CreditCard size={20} className="mb-1" /><span className="text-[10px] font-bold">Cartão</span>
            </button>
          </div>
          {renderPaymentContent()}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 space-y-2">
          <div className="flex justify-between text-sm text-stone-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm text-stone-500">
            <span>{fulfillmentMethod === 'delivery' ? 'Taxa de entrega' : 'Taxa de entrega (Isento)'}</span>
            <span className={fulfillmentMethod === 'pickup' ? 'text-green-600 font-bold' : ''}>
              {fulfillmentMethod === 'delivery' ? formatCurrency(settings.deliveryFee) : 'Grátis'}
            </span>
          </div>
          {useCashback && (
            <div className="flex justify-between text-sm text-amber-600 font-medium"><span>Desconto Cashback</span><span>- {formatCurrency(cashbackDiscount)}</span></div>
          )}
          <div className="border-t border-stone-100 pt-3 flex justify-between items-end mt-2">
            <span className="font-bold text-lg text-stone-800">Total</span>
            <span className="font-bold text-2xl text-stone-800">{formatCurrency(total)}</span>
          </div>

          {user ? (
            <Button
              onClick={handleFinishOrder}
              className="w-full mt-4 bg-brand-500 hover:bg-brand-600"
              disabled={
                isLoading ||
                (total > 0 && paymentMethod === 'card' && !cardType) ||
                (total > 0 && paymentMethod === 'money' && (parseFloat(cashGiven.replace(',', '.')) || 0) < total) ||
                (fulfillmentMethod === 'delivery' && !isAddressComplete)
              }
            >
              {isLoading ? 'Confirmando...' : (fulfillmentMethod === 'delivery' && !isAddressComplete ? 'Completar Endereço' : 'Confirmar Pedido')}
            </Button>
          ) : (
            <Button onClick={() => setCurrentView('login')} className="w-full mt-4 bg-stone-800 hover:bg-stone-900">
              <LogIn size={18} /> Entrar para Finalizar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};