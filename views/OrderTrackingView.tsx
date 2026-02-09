import React, { useState, useEffect } from 'react';
import { Package, XCircle, Heart, Star, ClipboardList, Clock, Navigation, CheckCircle2, ChevronLeft, ArrowRight, Coins, PartyPopper } from 'lucide-react';
import { Button } from '../components/UI';
import { useOrder } from '../contexts/OrderContext';
import { Order, OrderStatus, ViewState, CartItem } from '../types';

// Success Sub-component (when order is just placed)
export const SuccessView = ({ earnedCashback, setCurrentView }: { earnedCashback: number, setCurrentView: (v: ViewState) => void }) => {
   const gratitudePhrases = [
      "Obrigado por escolher a Hortal! Seu pão quentinho já está sendo preparado. 🥖",
      "Que alegria ter você aqui! Sua preferência nos move a sermos cada dia melhores. ✨",
      "Nossa cozinha já está a todo vapor para você! Muito obrigado pela confiança. 👨‍🍳",
      "Preparado com muito carinho e entregue com imensa gratidão. Valeu pela compra! ❤️",
      "Você é mais que um cliente, é parte fundamental da nossa história. Muito obrigado! 🥐"
   ];
   const randomPhrase = gratitudePhrases[Math.floor(Math.random() * gratitudePhrases.length)];
   const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

   return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-[10%] left-[5%] animate-bounce text-brand-500"><PartyPopper size={48} /></div>
            <div className="absolute bottom-[20%] right-[10%] animate-pulse text-amber-500"><Coins size={64} /></div>
            <div className="absolute top-[40%] right-[5%] animate-bounce text-red-500"><Heart size={32} /></div>
         </div>

         <div className="z-10 animate-fade-in scale-110 mb-8">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
               <CheckCircle2 size={48} />
            </div>
            <h1 className="text-3xl font-black text-stone-900 mb-2">Pedido Confirmado!</h1>
            <p className="text-stone-500 font-medium px-4">{randomPhrase}</p>
         </div>

         {earnedCashback > 0 && (
            <div className="z-10 bg-amber-50 border border-amber-100 p-6 rounded-3xl mb-8 w-full max-w-sm shadow-lg shadow-amber-100/50 mt-4">
               <div className="flex justify-center mb-2">
                  <Coins className="text-amber-500" size={32} />
               </div>
               <p className="text-amber-800 text-sm font-bold uppercase tracking-wider mb-1">Você ganhou Cashback!</p>
               <h2 className="text-2xl font-black text-amber-600 mb-1">+{formatCurrency(earnedCashback)}</h2>
               <p className="text-amber-700 text-xs font-medium">para usar na sua próxima compra!</p>
            </div>
         )}

         <div className="z-10 w-full max-w-xs space-y-3">
            <Button onClick={() => setCurrentView('order-tracking')} className="w-full">
               Acompanhar Pedido <ArrowRight size={18} />
            </Button>
            <button onClick={() => setCurrentView('shop')} className="text-stone-400 text-sm font-bold hover:text-stone-600 transition-colors py-2">
               Voltar ao Início
            </button>
         </div>
      </div>
   );
};

export const OrderTrackingView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
   const { orders, setOrders, refreshOrders, updateOrderRating } = useOrder();

   useEffect(() => {
      refreshOrders();
   }, []);

   const getRelevantOrder = () => {
      // 1. Try to find an in-progress order (received, preparing, delivery)
      const processingOrder = orders.find((o: Order) =>
         ['received', 'preparing', 'delivery'].includes(o.status)
      );
      if (processingOrder) return processingOrder;

      // 2. If no in-progress, only consider the absolute newest completed order for rating
      const latestCompleted = orders.find((o: Order) => o.status === 'completed');

      if (latestCompleted && !latestCompleted.rating && !latestCompleted.ratingSkipped) {
         return latestCompleted;
      }

      return null;
   };

   const currentOrder = getRelevantOrder();
   const [rating, setRating] = useState(0);
   const [comment, setComment] = useState('');
   const [showThankYou, setShowThankYou] = useState(false);
   const [thankYouMessage, setThankYouMessage] = useState('');

   const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

   if (!currentOrder) {
      const cancelledOrder = orders.find((o: Order) => o.status === 'cancelled');
      if (cancelledOrder) {
         return (
            <div className="min-h-screen bg-stone-55 flex flex-col items-center justify-center p-8 text-center">
               <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                  <XCircle size={40} />
               </div>
               <h2 className="text-xl font-bold text-stone-800">Pedido Cancelado</h2>
               <p className="text-stone-500 mt-2">O pedido #{cancelledOrder.id.slice(-4)} foi cancelado pelo estabelecimento.</p>
               <Button onClick={() => setCurrentView('shop')} className="mt-6">Voltar ao Menu</Button>
            </div>
         );
      }

      return (
         <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-center">
            <Package size={64} className="text-stone-300 mb-4" />
            <h2 className="text-xl font-bold text-stone-800">Nenhum pedido ativo</h2>
            <p className="text-stone-500 mt-2">Você ainda não tem pedidos em andamento.</p>
            <Button onClick={() => setCurrentView('shop')} className="mt-6">Fazer um Pedido</Button>
         </div>
      );
   }

   if (currentOrder.status === 'completed' && !currentOrder.rating && !currentOrder.ratingSkipped) {
      const handleRatingSubmit = () => {
         let msg = "";
         switch (rating) {
            case 1: msg = "Sinto muito que sua experiência não tenha sido ideal. Vamos melhorar!"; break;
            case 2: msg = "Obrigado pelo feedback. Vamos trabalhar para corrigir os pontos negativos."; break;
            case 3: msg = "Obrigado pela avaliação! Esperamos surpreender você na próxima."; break;
            case 4: msg = "Muito obrigado! Ficamos felizes que tenha gostado do seu pedido."; break;
            case 5: msg = "Uau! Muito obrigado! É um prazer ter você como cliente! ⭐"; break;
            default: msg = "Obrigado pela avaliação!";
         }
         setThankYouMessage(msg);
         setShowThankYou(true);

         setTimeout(async () => {
            await updateOrderRating(currentOrder.id, rating, comment);
            setShowThankYou(false);
         }, 3000);
      };

      const handleSkip = async () => {
         await updateOrderRating(currentOrder.id, 0, undefined, true);
      };

      if (showThankYou) {
         return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-fade-in">
               <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce">
                  <Heart size={40} fill="currentColor" />
               </div>
               <h2 className="text-2xl font-black text-stone-800 mb-4">Agradecemos sua avaliação!</h2>
               <p className="text-stone-500 font-medium text-lg">{thankYouMessage}</p>
            </div>
         );
      }

      return (
         <div className="min-h-screen bg-stone-50 flex flex-col p-4 justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100 text-center space-y-6">
               <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-500">
                  <Star size={32} />
               </div>
               <div>
                  <h2 className="text-2xl font-black text-stone-800">Pedido Entregue!</h2>
                  <p className="text-stone-500 mt-2">Como foi sua experiência com o pedido <span className="font-bold">#{currentOrder.id.slice(-4)}</span>?</p>
               </div>

               <div className="flex justify-center gap-2 py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                     <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-transform active:scale-90 hover:scale-110 focus:outline-none"
                     >
                        <Star
                           size={40}
                           className={star <= rating ? "text-amber-400 fill-amber-400" : "text-stone-200 fill-stone-100"}
                           strokeWidth={star <= rating ? 0 : 1.5}
                        />
                     </button>
                  ))}
               </div>

               <textarea
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-brand-500 resize-none h-32"
                  placeholder="Gostaria de deixar alguma observação? (Opcional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
               />

               <div className="space-y-3">
                  <Button
                     onClick={handleRatingSubmit}
                     className="w-full"
                     disabled={rating === 0}
                  >
                     Avaliar Pedido
                  </Button>
                  <button
                     onClick={handleSkip}
                     className="w-full py-3 text-stone-400 text-sm font-bold hover:text-stone-600"
                  >
                     Não quero avaliar
                  </button>
               </div>
            </div>
         </div>
      );
   }

   const statuses: { id: OrderStatus, label: string, icon: any }[] = [
      { id: 'received', label: 'Pedido Recebido', icon: <ClipboardList size={20} /> },
      { id: 'preparing', label: 'Em Preparo', icon: <Clock size={20} /> },
      { id: 'delivery', label: 'Saiu para Entrega', icon: <Navigation size={20} /> },
      { id: 'completed', label: 'Entregue', icon: <CheckCircle2 size={20} /> }
   ];

   const currentIndex = statuses.findIndex(s => s.id === currentOrder.status);

   return (
      <div className="bg-stone-50 min-h-screen pb-24">
         <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
               <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-stone-100 rounded-full">
                  <ChevronLeft size={24} className="text-stone-600" />
               </button>
               <h1 className="text-lg font-bold text-stone-800">Acompanhar Pedido</h1>
            </div>
         </div>

         <div className="p-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 text-center">
               <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Código para o Entregador</p>
               <div className="bg-brand-50 text-brand-500 inline-flex gap-3 p-4 rounded-2xl border-2 border-dashed border-brand-200">
                  {currentOrder.deliveryCode.split('').map((char: string, i: number) => (
                     <span key={i} className="text-3xl font-black">{char}</span>
                  ))}
               </div>
               <p className="text-xs text-stone-400 mt-4 leading-relaxed">
                  Mostre este código ao entregador quando ele chegar para concluir a entrega com segurança.
               </p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-8 relative overflow-hidden">
               {statuses.map((s, idx) => {
                  const isActive = idx <= currentIndex;
                  const isCurrent = idx === currentIndex;
                  return (
                     <div key={s.id} className="flex items-center gap-4 relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-300'}`}>
                           {s.icon}
                        </div>
                        <div>
                           <p className={`text-sm font-bold ${isActive ? 'text-stone-800' : 'text-stone-300'}`}>{s.label}</p>
                           {isCurrent && <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider animate-pulse">Acontecendo agora</p>}
                        </div>
                        {idx < statuses.length - 1 && (
                           <div className={`absolute left-5 top-10 w-0.5 h-8 ${idx < currentIndex ? 'bg-brand-500' : 'bg-stone-100'}`} />
                        )}
                     </div>
                  );
               })}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-4">
               <h3 className="text-sm font-bold text-stone-800">Resumo do Pedido #{currentOrder.id.slice(-4)}</h3>
               <div className="space-y-2">
                  {currentOrder.items.map((item: CartItem) => (
                     <div key={item.id} className="flex justify-between text-xs text-stone-500">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                     </div>
                  ))}
               </div>
               <div className="pt-3 border-t border-stone-100 flex justify-between font-bold text-stone-800">
                  <span>Total</span>
                  <span>{formatCurrency(currentOrder.total)}</span>
               </div>
            </div>
         </div>
      </div>
   );
};
