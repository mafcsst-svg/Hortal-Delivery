import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Settings, LogOut, TrendingUp, Package, Sparkles, UserPlus, Users, MessageSquare, UtensilsCrossed,
  MapPin, Phone, CreditCard, Printer, Search, Minus, Plus, Edit3, Eye, EyeOff, Save, X, CheckCircle2,
  Truck, ShoppingBag, Image as ImageIcon, AlignLeft, Upload, Send, Bell
} from 'lucide-react';
import { Button, Input } from '../components/UI';
import { useUser } from '../contexts/UserContext';
import { useProducts } from '../contexts/ProductContext';
import { useOrder } from '../contexts/OrderContext';
import { ViewState, Order, OrderStatus, CartItem, Product, ProductCategory, Message, User } from '../types';
import { generateProductDescription, suggestPrice } from '../services/geminiService';
import { APP_NAME, APP_SUBTITLE } from '../constants';
import { supabase } from '../services/supabaseClient';

export const AdminView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { user, updateUserProfile, allUsers, setAllUsers, settings, setSettings, logout } = useUser();
  const { products, setProducts, categories, refreshCategories } = useProducts();
  const [editingCategory, setEditingCategory] = useState<{ id?: string, name: string, emoji: string, display_order: number, active: boolean }>({ name: '', emoji: '', display_order: 0, active: true });

  const { orders, setOrders, messages, setMessages, refreshOrders, updateOrderStatus, isRealtimeConnected } = useOrder();

  const [activeTab, setActiveTab] = useState<'orders' | 'messages' | 'products' | 'categories' | 'settings' | 'analytics' | 'manual-order' | 'customers'>('orders');
  const [orderSubTab, setOrderSubTab] = useState<'active' | 'history'>('active');
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [adminInput, setAdminInput] = useState('');

  // Product State
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({ category: 'panificacao', active: true });
  const [productSearch, setProductSearch] = useState('');

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [verificationCodes, setVerificationCodes] = useState<Record<string, string>>({});
  const [searchUser, setSearchUser] = useState('');
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New Message Alert State
  const [newMessageAlert, setNewMessageAlert] = useState<{ show: boolean; customerName: string; text: string } | null>(null);
  const previousMessagesCount = useRef<number>(messages.length);

  // Customer Management State
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', email: '', phone: '', cpf: '',
    zipCode: '', street: '', number: '', neighborhood: '', city: '', state: 'SP'
  });

  // Manual Order State
  const [manualOrderItems, setManualOrderItems] = useState<CartItem[]>([]);
  const [manualCustomer, setManualCustomer] = useState({ name: '', phone: '', zip: '', street: '', number: '', neighborhood: '', city: '' });
  const [manualPayment, setManualPayment] = useState<'pix' | 'money' | 'card'>('money');
  const [manualFulfillment, setManualFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [manualProductSearch, setManualProductSearch] = useState('');
  const [manualCustomerSearch, setManualCustomerSearch] = useState('');

  const paymentMap: Record<string, string> = { pix: 'Pix', money: 'Dinheiro', card: 'Cartão' };



  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((u) =>
      u.role !== 'admin' &&
      (u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.phone && u.phone.includes(searchUser)))
    );
  }, [allUsers, searchUser]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const filteredCustomersForOrder = useMemo(() => {
    if (!manualCustomerSearch.trim()) return [];
    return allUsers.filter(u =>
      u.role === 'customer' &&
      (u.name.toLowerCase().includes(manualCustomerSearch.toLowerCase()) ||
        (u.phone && u.phone.includes(manualCustomerSearch)))
    );
  }, [allUsers, manualCustomerSearch]);

  const { sendMessage } = useOrder();

  // Effect to detect new customer messages and show alert
  useEffect(() => {
    if (messages.length > previousMessagesCount.current) {
      // Check if the new message is from a customer (not admin)
      const newMessages = messages.slice(previousMessagesCount.current);
      const customerMessage = newMessages.find(m => !m.isAdmin);

      if (customerMessage) {
        const customerName = allUsers.find(u => u.id === customerMessage.customerId)?.name || 'Cliente';
        setNewMessageAlert({
          show: true,
          customerName,
          text: customerMessage.text.length > 50 ? customerMessage.text.substring(0, 50) + '...' : customerMessage.text
        });

        // Play notification sound
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.3;

          oscillator.start();
          setTimeout(() => {
            oscillator.frequency.value = 1000;
          }, 100);
          setTimeout(() => {
            oscillator.stop();
            audioContext.close();
          }, 200);
        } catch (e) {
          console.log('Audio notification not supported');
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
          setNewMessageAlert(null);
        }, 5000);
      }
    }
    previousMessagesCount.current = messages.length;
  }, [messages, allUsers]);

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim() || !selectedUserChat) return;

    try {
      await sendMessage(adminInput, selectedUserChat);
      setAdminInput('');
    } catch (err) {
      alert('Erro ao enviar resposta.');
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm(`Tem certeza que deseja cancelar o pedido #${order.id.slice(-4)}?`)) return;

    try {
      await handleUpdateStatus(order.id, 'cancelled');

      if (order.cashbackEarned && order.cashbackEarned > 0) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', order.customer_id as any)
          .single();

        if (!profileErr && profile) {
          const newBalance = Math.max(0, Number(profile.cashback_balance) + (order.cashbackEarned || 0));
          await supabase
            .from('profiles')
            .update({ cashback_balance: newBalance })
            .eq('id', profile.id);
          alert(`Pedido cancelado e ${formatCurrency(order.cashbackEarned)} de cashback estornado.`);
        } else {
          alert("Pedido cancelado.");
        }
      } else {
        alert("Pedido cancelado.");
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      alert('Erro ao cancelar pedido');
    }
  };

  const handleVerifyCode = async (orderId: string, actualCode: string) => {
    const inputCode = verificationCodes[orderId];
    if (inputCode === actualCode) {
      await handleUpdateStatus(orderId, 'completed');
      alert("Pedido finalizado com sucesso!");
    } else {
      alert("Código de verificação incorreto!");
    }
  };

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 5px 0;">${item.quantity}x ${item.name}</td>
        <td style="text-align: right; padding: 5px 0;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    const paymentMapPrint: Record<string, string> = { pix: 'PIX', money: 'DINHEIRO', card: 'CARTÃO' };

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido #${order.id.slice(-4)}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; font-size: 12px; color: #000;}
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .dashed { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${APP_NAME}</div>
          <div class="center">${APP_SUBTITLE}</div>
          <div class="center">Tel: (17) 99253-7394</div>
          <div class="dashed"></div>
          <div><b>PEDIDO:</b> #${order.id.slice(-4)}</div>
          <div><b>DATA:</b> ${new Date(order.date).toLocaleString('pt-BR')}</div>
          <div class="dashed"></div>
          <div><b>CLIENTE:</b> ${order.customerName}</div>
          <div><b>TEL:</b> ${order.customerPhone}</div>
          <div><b>ENDEREÇO:</b><br/>${order.address.street}, ${order.address.number}<br/>${order.address.neighborhood} - ${order.address.city}</div>
          <div class="dashed"></div>
          <table>
            <thead><tr><th style="text-align: left;">QTD ITEM</th><th style="text-align: right;">VALOR</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="dashed"></div>
          <div><b>PAGAMENTO:</b> ${paymentMapPrint[order.paymentMethod] || order.paymentMethod.toUpperCase()} ${order.paymentDetail ? `(${order.paymentDetail})` : ''}</div>
          <div class="dashed"></div>
          <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>${formatCurrency(order.subtotal)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Taxa Entrega:</span><span>${formatCurrency(order.deliveryFee)}</span></div>
          <div class="total-row" style="display: flex; justify-content: space-between; margin-top: 5px;"><span>TOTAL:</span><span>${formatCurrency(order.total)}</span></div>
          <div class="dashed"></div>
          <div class="center footer">Obrigado pela preferência!<br/>Este cupom não tem valor fiscal.</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleGenerateAI = async () => {
    if (!editingProduct.name || !editingProduct.category) return;
    setIsGeneratingAI(true);
    const desc = await generateProductDescription(editingProduct.name, editingProduct.category as ProductCategory);
    const price = await suggestPrice(editingProduct.name, editingProduct.category as ProductCategory);
    setEditingProduct(prev => ({ ...prev, description: desc, price: prev.price || price }));
    setIsGeneratingAI(false);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct.name || !editingProduct.price) return;
    setIsLoading(true);
    try {
      const productData = {
        name: editingProduct.name,
        description: editingProduct.description || '',
        price: Number(editingProduct.price),
        category: editingProduct.category as ProductCategory,
        image: editingProduct.image || `https://picsum.photos/400/400?random=${Date.now()}`,
        active: editingProduct.active ?? true
      };

      if (editingProduct.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const newId = `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const { error } = await supabase
          .from('products')
          .insert({ id: newId, ...productData });
        if (error) throw error;
      }

      setEditingProduct({ category: 'panificacao', active: true });
      alert("Produto salvo com sucesso!");
    } catch (err: any) {
      console.error('Error saving product:', err);
      alert('Erro ao salvar produto: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct({ category: 'panificacao', active: true });
  }

  const toggleProductActive = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !product.active })
        .eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error toggling product:', err);
      alert('Erro ao alterar status do produto');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSaveCategory = async () => {
    if (!editingCategory.name) return;
    setIsLoading(true);
    try {
      if (editingCategory.id) {
        const { error } = await supabase
          .from('categories')
          .update(editingCategory)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const newId = editingCategory.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        const { error } = await supabase
          .from('categories')
          .insert({ ...editingCategory, id: newId });
        if (error) throw error;
      }
      setEditingCategory({ name: '', emoji: '', display_order: 0, active: true });
      await refreshCategories();
      alert("Categoria salva com sucesso!");
    } catch (err: any) {
      console.error('Error saving category:', err);
      alert('Erro ao salvar categoria: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await refreshCategories();
    } catch (err: any) {
      alert('Erro ao excluir categoria: ' + err.message);
    }
  };


  const addManualItem = (product: Product) => {
    setManualOrderItems(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateManualQty = (id: string, delta: number) => {
    setManualOrderItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const selectCustomerForOrder = (customer: User) => {
    setManualCustomer({
      name: customer.name,
      phone: customer.phone || '',
      zip: customer.address?.zipCode || '',
      street: customer.address?.street || '',
      number: customer.address?.number || '',
      neighborhood: customer.address?.neighborhood || '',
      city: customer.address?.city || ''
    });
    setManualCustomerSearch('');
  };

  const finalizeManualOrder = async () => {
    if (!manualCustomer.name || manualOrderItems.length === 0) return;

    setIsLoading(true);
    const subtotal = manualOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const deliveryFee = manualFulfillment === 'delivery' ? settings.deliveryFee : 0;
    const total = subtotal + deliveryFee;

    try {
      const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: manualCustomer.name,
          customer_phone: manualCustomer.phone,
          address: {
            zipCode: manualCustomer.zip, street: manualCustomer.street, number: manualCustomer.number,
            neighborhood: manualCustomer.neighborhood, city: manualCustomer.city, state: 'SP'
          },
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method: manualPayment,
          status: 'received',
          delivery_code: deliveryCode,
          cashback_earned: 0
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = manualOrderItems.map(item => ({
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

      setManualOrderItems([]);
      setManualCustomer({ name: '', phone: '', zip: '', street: '', number: '', neighborhood: '', city: '' });
      setActiveTab('orders');
      alert(`Pedido manual criado com sucesso! (${manualFulfillment === 'pickup' ? 'Retirada' : 'Entrega'})`);
      await refreshOrders();
    } catch (err: any) {
      console.error('Error creating manual order:', err);
      alert('Erro ao criar pedido manual: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterCustomer = () => {
    if (!newCustomer.name) return;

    const newUser: User = {
      id: Date.now().toString(),
      name: newCustomer.name,
      email: newCustomer.email || `cliente-${Date.now()}@hortal.local`,
      phone: newCustomer.phone,
      cpf: newCustomer.cpf,
      role: 'customer',
      cashbackBalance: 0,
      orderHistory: [],
      address: {
        zipCode: newCustomer.zipCode,
        street: newCustomer.street,
        number: newCustomer.number,
        neighborhood: newCustomer.neighborhood,
        city: newCustomer.city,
        state: newCustomer.state
      }
    };

    setAllUsers(prev => [...prev, newUser]);
    setShowNewCustomerForm(false);
    setNewCustomer({ name: '', email: '', phone: '', cpf: '', zipCode: '', street: '', number: '', neighborhood: '', city: '', state: 'SP' });
    alert("Cliente cadastrado com sucesso!");
  };

  const handleSaveSettings = () => {
    setShowSettingsSuccess(true);
    setTimeout(() => setShowSettingsSuccess(false), 2000);
  };

  return (
    <div className="pb-24 bg-stone-50 min-h-screen">
      {/* New Message Alert */}
      {newMessageAlert && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce"
          onClick={() => {
            setNewMessageAlert(null);
            setActiveTab('messages');
          }}
        >
          <div className="bg-brand-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-brand-500/30 flex items-center gap-4 cursor-pointer hover:bg-brand-600 transition-all max-w-[90vw]">
            <div className="bg-white/20 p-3 rounded-full animate-pulse">
              <Bell size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-white rounded-full animate-ping"></span>
                Nova mensagem de {newMessageAlert.customerName}
              </p>
              <p className="text-xs text-brand-100 truncate">{newMessageAlert.text}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNewMessageAlert(null);
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="bg-stone-900 text-white p-6 rounded-b-[30px] mb-6 shadow-2xl relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="text-brand-50" /> Admin</h2>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isRealtimeConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isRealtimeConnected ? 'Online' : 'Offline'}
            </div>
          </div>
          <button onClick={logout} className="bg-stone-800 p-2 rounded-lg hover:bg-stone-700 transition-colors"><LogOut size={18} /></button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'orders', label: 'Pedidos', icon: <Package size={16} /> },
            { id: 'manual-order', label: 'Criar Pedido', icon: <UserPlus size={16} /> },
            { id: 'customers', label: 'Clientes', icon: <Users size={16} /> },
            { id: 'messages', label: 'Mensagens', icon: <MessageSquare size={16} /> },
            { id: 'products', label: 'Estoque', icon: <UtensilsCrossed size={16} /> },
            { id: 'categories', label: 'Categorias', icon: <AlignLeft size={16} /> },
            { id: 'settings', label: 'Configurações', icon: <Settings size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-lg' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex p-1 bg-stone-200 rounded-xl mb-4">
              <button
                onClick={() => setOrderSubTab('active')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orderSubTab === 'active' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}
              >
                Ativos
              </button>
              <button
                onClick={() => setOrderSubTab('history')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orderSubTab === 'history' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}
              >
                Histórico
              </button>
            </div>

            {orderSubTab === 'active' ? (
              orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length === 0 ? (
                <div className="text-center py-20 text-stone-400">Nenhum pedido ativo no momento.</div>
              ) : (
                orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').reverse().map(o => (
                  <div key={o.id} className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Pedido #{o.id.slice(-4)}</p>
                        <h4 className="font-bold text-stone-800">{o.customerName}</h4>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handlePrintOrder(o)} className="p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-brand-50 hover:text-brand-500 transition-colors" title="Imprimir Cupom"><Printer size={18} /></button>
                        <span className="bg-brand-50 text-brand-500 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center">{o.status}</span>
                      </div>
                    </div>

                    <div className="text-xs text-stone-500 space-y-1">
                      <p className="flex items-center gap-2 font-medium"><MapPin size={14} className="text-stone-300" /> {o.address.street}, {o.address.number}</p>
                      <p className="flex items-center gap-2"><Phone size={14} className="text-stone-300" /> {o.customerPhone}</p>
                      <p className="flex items-center gap-2 capitalize"><CreditCard size={14} className="text-stone-300" /> {paymentMap[o.paymentMethod]} {o.paymentDetail && `(${o.paymentDetail})`}</p>
                    </div>

                    <div className="bg-stone-50 rounded-2xl p-3 space-y-2">
                      {o.items.map(item => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-stone-600">{item.quantity}x {item.name}</span>
                          <span className="font-bold text-stone-800">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-800">
                        <span>Total</span>
                        <span>{formatCurrency(o.total)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {o.status === 'received' && <Button onClick={() => handleUpdateStatus(o.id, 'preparing')} className="flex-1 py-2 text-xs">Preparar</Button>}
                        {o.status === 'preparing' && <Button onClick={() => handleUpdateStatus(o.id, 'delivery')} className="flex-1 py-2 text-xs" variant="success">Saiu para Entrega</Button>}
                        {o.status === 'delivery' && (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              placeholder="Código do cliente"
                              className="w-1/2 px-3 py-2 text-xs border border-stone-200 rounded-xl outline-none focus:border-brand-500"
                              value={verificationCodes[o.id] || ''}
                              onChange={(e) => setVerificationCodes({ ...verificationCodes, [o.id]: e.target.value })}
                            />
                            <Button onClick={() => handleVerifyCode(o.id, o.deliveryCode)} className="flex-1 py-2 text-xs bg-brand-500">Concluir</Button>
                          </div>
                        )}
                      </div>
                      <Button onClick={() => handleCancelOrder(o)} className="w-full py-2 text-xs" variant="danger">
                        Cancelar Pedido
                      </Button>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="space-y-3">
                {orders.filter(o => o.status === 'completed' || o.status === 'cancelled').length === 0 ? (
                  <div className="text-center py-20 text-stone-400">Histórico vazio.</div>
                ) : (
                  orders.filter(o => o.status === 'completed' || o.status === 'cancelled').reverse().map(o => (
                    <div key={o.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${o.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {o.status === 'completed' ? 'Concluído' : 'Cancelado'}
                          </span>
                          <span className="text-xs text-stone-400">#{o.id.slice(-4)}</span>
                        </div>
                        <p className="font-bold text-stone-800 text-sm">{o.customerName}</p>
                        <p className="text-xs text-stone-500">{new Date(o.date).toLocaleDateString('pt-BR')} - {new Date(o.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <button onClick={() => handlePrintOrder(o)} className="p-2 text-stone-400 hover:text-stone-600"><Printer size={18} /></button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
            {/* Thread List */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100 flex flex-col gap-4">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-brand-500" /> Conversas
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {(() => {
                  const threads = Array.from(new Set(messages.map(m => m.customerId)));
                  if (threads.length === 0) return <p className="text-center py-10 text-stone-400 text-xs text-pretty italic">Nenhuma conversa iniciada.</p>;

                  return threads.map(cid => {
                    const lastMsg = [...messages].reverse().find(m => m.customerId === cid);
                    const customer = allUsers.find(u => u.id === cid);
                    return (
                      <div
                        key={cid}
                        onClick={() => setSelectedUserChat(cid)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${selectedUserChat === cid ? 'bg-brand-50 border-brand-200' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-xs text-stone-900">{customer?.name || 'Cliente'}</p>
                          <span className="text-[9px] text-stone-400">{lastMsg?.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 line-clamp-1 italic">{lastMsg?.text}</p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Chat Content */}
            <div className="md:col-span-2 bg-white rounded-3xl shadow-sm border border-stone-100 flex flex-col overflow-hidden">
              {selectedUserChat ? (
                <>
                  <div className="p-4 border-b border-stone-50 flex items-center gap-3 bg-stone-50/50">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs uppercase">
                      {allUsers.find(u => u.id === selectedUserChat)?.name.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-stone-800">{allUsers.find(u => u.id === selectedUserChat)?.name || 'Carregando...'}</h4>
                      <p className="text-[10px] text-stone-400">{allUsers.find(u => u.id === selectedUserChat)?.phone}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-stone-50/30">
                    {messages.filter(m => m.customerId === selectedUserChat).map(m => (
                      <div key={m.id} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs shadow-sm ${m.isAdmin ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white text-stone-800 rounded-tl-none border border-stone-100'}`}>
                          <p className="leading-relaxed">{m.text}</p>
                          <p className={`text-[9px] mt-1 text-right ${m.isAdmin ? 'text-brand-100' : 'text-stone-400'}`}>{m.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAdminReply} className="p-4 bg-white border-t border-stone-100 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500"
                      placeholder="Resposta rápida..."
                      value={adminInput}
                      onChange={(e) => setAdminInput(e.target.value)}
                    />
                    <button type="submit" disabled={!adminInput.trim()} className="bg-brand-500 text-white p-3 rounded-xl disabled:opacity-50 transition-all shadow-md active:scale-95">
                      <Send size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-300 p-10 text-center gap-4">
                  <div className="bg-stone-50 p-6 rounded-full">
                    <MessageSquare size={48} className="opacity-20" />
                  </div>
                  <p className="text-sm font-medium">Selecione uma conversa para começar a responder.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'manual-order' && (
          <div className="space-y-6 pb-24">
            {/* Product Selection */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
              <h3 className="font-bold text-stone-800 flex items-center gap-2"><Search className="text-brand-500" size={20} /> Adicionar Produtos</h3>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border-none text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Buscar produto..."
                  value={manualProductSearch}
                  onChange={(e) => setManualProductSearch(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {products.filter(p => p.name.toLowerCase().includes(manualProductSearch.toLowerCase()) && p.active).map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2 hover:bg-stone-50 rounded-lg border border-transparent hover:border-stone-100 transition-all cursor-pointer" onClick={() => addManualItem(p)}>
                    <div className="flex items-center gap-2">
                      <img src={p.image} className="w-8 h-8 rounded bg-stone-200 object-cover" />
                      <div>
                        <p className="text-xs font-bold text-stone-800">{p.name}</p>
                        <p className="text-[10px] text-stone-500">{formatCurrency(p.price)}</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center"><Plus size={14} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart & Customer Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cart Items */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
                <h3 className="font-bold text-stone-800 flex items-center gap-2"><Package className="text-brand-500" size={20} /> Itens do Pedido</h3>
                {manualOrderItems.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-4">Nenhum item adicionado.</p>
                ) : (
                  <div className="space-y-2">
                    {manualOrderItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-stone-50 p-2 rounded-lg">
                        <div className="text-xs">
                          <p className="font-bold text-stone-800">{item.name}</p>
                          <p className="text-stone-500">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 shadow-sm">
                          <button onClick={() => updateManualQty(item.id, -1)} className="p-1.5 text-brand-500 hover:bg-stone-50"><Minus size={14} /></button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateManualQty(item.id, 1)} className="p-1.5 text-brand-500 hover:bg-stone-50"><Plus size={14} /></button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-stone-100 flex justify-between font-bold text-stone-800">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(manualOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4 relative">
                <h3 className="font-bold text-stone-800 flex items-center gap-2"><Users className="text-brand-500" size={20} /> Dados do Cliente</h3>

                {/* Fulfillment Toggle */}
                <div className="flex p-1 bg-stone-100 rounded-xl mb-2">
                  <button
                    onClick={() => setManualFulfillment('delivery')}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${manualFulfillment === 'delivery' ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    <Truck size={14} /> Entrega
                  </button>
                  <button
                    onClick={() => setManualFulfillment('pickup')}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${manualFulfillment === 'pickup' ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    <ShoppingBag size={14} /> Retirada
                  </button>
                </div>

                {/* Customer Search Auto-fill */}
                <div className="relative z-20">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-50 border border-brand-100 text-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-brand-300 text-brand-700 font-bold"
                      placeholder="Buscar Cliente Cadastrado..."
                      value={manualCustomerSearch}
                      onChange={(e) => setManualCustomerSearch(e.target.value)}
                    />
                  </div>
                  {manualCustomerSearch && filteredCustomersForOrder.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-stone-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {filteredCustomersForOrder.map(c => (
                        <div
                          key={c.id}
                          onClick={() => selectCustomerForOrder(c)}
                          className="p-3 hover:bg-stone-50 cursor-pointer border-b border-stone-50 last:border-0"
                        >
                          <p className="text-xs font-bold text-stone-800">{c.name}</p>
                          <p className="text-[10px] text-stone-500">{c.phone} - {c.address?.street}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Input label="Nome" value={manualCustomer.name} onChange={(e: any) => setManualCustomer({ ...manualCustomer, name: e.target.value })} />
                <Input label="Telefone" value={manualCustomer.phone} onChange={(e: any) => setManualCustomer({ ...manualCustomer, phone: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Rua" value={manualCustomer.street} onChange={(e: any) => setManualCustomer({ ...manualCustomer, street: e.target.value })} />
                  <Input label="Número" value={manualCustomer.number} onChange={(e: any) => setManualCustomer({ ...manualCustomer, number: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Bairro" value={manualCustomer.neighborhood} onChange={(e: any) => setManualCustomer({ ...manualCustomer, neighborhood: e.target.value })} />
                  <Input label="Cidade" value={manualCustomer.city} onChange={(e: any) => setManualCustomer({ ...manualCustomer, city: e.target.value })} />
                </div>

                <h4 className="font-bold text-xs uppercase text-stone-400 mt-4">Pagamento</h4>
                <div className="flex gap-2">
                  {['money', 'pix', 'card'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setManualPayment(m as any)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${manualPayment === m ? 'bg-brand-50 border-brand-500 text-brand-500' : 'bg-white border-stone-200 text-stone-500'}`}
                    >
                      {paymentMap[m]}
                    </button>
                  ))}
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 mt-4">
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(manualOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-500 mb-2">
                    <span>Taxa de Entrega:</span>
                    <span>{manualFulfillment === 'delivery' ? formatCurrency(settings.deliveryFee) : 'Grátis'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-800 border-t border-stone-200 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(manualOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + (manualFulfillment === 'delivery' ? settings.deliveryFee : 0))}</span>
                  </div>
                </div>

                <Button onClick={finalizeManualOrder} disabled={!manualCustomer.name || manualOrderItems.length === 0 || isLoading} isLoading={isLoading} className="w-full mt-2">
                  {isLoading ? 'Criando...' : 'Criar Pedido'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-800 flex items-center gap-2"><Users className="text-brand-500" size={20} /> Base de Clientes</h3>
                <Button onClick={() => setShowNewCustomerForm(true)} className="py-2 text-xs"><UserPlus size={16} /> Novo Cliente</Button>
              </div>

              {/* Registration Form Modal/Inline */}
              {showNewCustomerForm && (
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3 animate-fade-in relative">
                  <button onClick={() => setShowNewCustomerForm(false)} className="absolute top-2 right-2 text-stone-400 hover:text-red-500"><X size={18} /></button>
                  <h4 className="text-sm font-bold text-stone-800">Novo Cadastro</h4>

                  <Input label="Nome Completo" value={newCustomer.name} onChange={(e: any) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Telefone" value={newCustomer.phone} onChange={(e: any) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                    <Input label="Email (Opcional)" value={newCustomer.email} onChange={(e: any) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                  </div>

                  <h5 className="text-xs font-bold text-stone-400 mt-2">Endereço</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <Input label="CEP" value={newCustomer.zipCode} onChange={(e: any) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })} />
                    <div className="col-span-2">
                      <Input label="Cidade" value={newCustomer.city} onChange={(e: any) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input label="Rua" value={newCustomer.street} onChange={(e: any) => setNewCustomer({ ...newCustomer, street: e.target.value })} />
                    </div>
                    <Input label="Nº" value={newCustomer.number} onChange={(e: any) => setNewCustomer({ ...newCustomer, number: e.target.value })} />
                  </div>
                  <Input label="Bairro" value={newCustomer.neighborhood} onChange={(e: any) => setNewCustomer({ ...newCustomer, neighborhood: e.target.value })} />

                  <Button onClick={handleRegisterCustomer} disabled={!newCustomer.name} className="w-full mt-2 bg-green-600 hover:bg-green-700">
                    <Save size={16} /> Salvar Cliente
                  </Button>
                </div>
              )}

              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border-none text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Buscar por nome ou email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-stone-400 py-4">Nenhum cliente encontrado.</p>
                ) : (
                  filteredUsers.map((u: User) => (
                    <div key={u.id} className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-stone-800 text-sm">{u.name}</p>
                        <p className="text-xs text-stone-500">{u.email}</p>
                        {u.phone && <p className="text-xs text-stone-500 flex items-center gap-1 mt-1"><Phone size={10} /> {u.phone}</p>}
                      </div>
                      {u.address?.street && (
                        <div className="text-right text-xs text-stone-400">
                          <p>{u.address.street}, {u.address.number}</p>
                          <p>{u.address.city}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <h3 className="font-bold text-lg mb-4">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <div className="space-y-4">
                <Input label="Nome" value={editingProduct.name || ''} onChange={(e: any) => setEditingProduct({ ...editingProduct, name: e.target.value })} />

                <div className="space-y-1.5 w-full text-left">
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">Categoria</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-medium text-stone-700"
                    value={editingProduct.category || 'panificacao'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as ProductCategory })}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <Button type="button" variant="outline" onClick={handleGenerateAI} isLoading={isGeneratingAI} disabled={!editingProduct.name}><Sparkles size={18} /> AI Assistente</Button>

                <div className="space-y-1.5 w-full text-left">
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">Descrição</label>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-medium text-stone-700 h-24 resize-none"
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    placeholder="Descreva o produto..."
                  />
                </div>

                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  value={editingProduct.price || ''}
                  onChange={(e: any) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                />

                <div className="space-y-1.5 w-full text-left">
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">Imagem do Produto</label>
                  <div className="flex items-center gap-4">
                    {editingProduct.image ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden group border border-stone-200">
                        <img src={editingProduct.image} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-20 h-20 bg-stone-100 rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-200 hover:border-brand-300 hover:text-brand-500 transition-all">
                        <Upload size={20} />
                        <span className="text-[10px] font-bold mt-1">Enviar</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    )}
                    <div className="flex-1 text-xs text-stone-400">
                      {editingProduct.image ? 'Imagem carregada com sucesso.' : 'Clique para fazer upload de uma foto do produto (JPG, PNG).'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {editingProduct.id && (
                    <Button type="button" variant="ghost" onClick={handleCancelEdit} className="flex-1">Cancelar</Button>
                  )}
                  <Button onClick={handleSaveProduct} className="flex-[2] bg-brand-500 hover:bg-brand-600">
                    <Save size={18} /> {editingProduct.id ? 'Atualizar Produto' : 'Cadastrar Produto'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-800">Produtos Cadastrados</h3>
                <div className="relative w-40">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-stone-50 border border-stone-100 text-xs outline-none focus:border-brand-500"
                    placeholder="Buscar..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredProducts.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border group transition-all ${p.active ? 'bg-stone-50 border-stone-100' : 'bg-stone-100/50 border-stone-100 opacity-60 grayscale'}`}>
                    <div className="flex items-center gap-3">
                      <img src={p.image} className="w-10 h-10 rounded-lg object-cover bg-white" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-stone-800">{p.name}</p>
                          {!p.active && <span className="text-[10px] bg-stone-200 text-stone-500 px-1.5 rounded font-bold">Inativo</span>}
                        </div>
                        <p className="text-[10px] text-stone-500">{formatCurrency(p.price)} • {categories.find(c => c.id === p.category)?.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingProduct(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-stone-400 hover:text-brand-500 hover:bg-white rounded-lg transition-all"><Edit3 size={16} /></button>
                      <button onClick={() => toggleProductActive(p.id)} className={`p-2 rounded-lg transition-all ${p.active ? 'text-green-600 hover:bg-green-100' : 'text-stone-400 hover:bg-stone-200'}`}>{p.active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-sm text-stone-400 py-4">Nenhum produto encontrado.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <h3 className="font-bold text-lg mb-4">{editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <div className="space-y-4">
                <Input
                  label="Nome da Categoria"
                  value={editingCategory.name}
                  onChange={(e: any) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="Ex: Bebidas, Lanches..."
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Emoji (Ícone)"
                    value={editingCategory.emoji}
                    onChange={(e: any) => setEditingCategory({ ...editingCategory, emoji: e.target.value })}
                    placeholder="Ex: 🍔, 🥤"
                  />
                  <Input
                    label="Ordem de Exibição"
                    type="number"
                    value={editingCategory.display_order}
                    onChange={(e: any) => setEditingCategory({ ...editingCategory, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {editingCategory.id && (
                    <Button type="button" variant="ghost" onClick={() => setEditingCategory({ name: '', emoji: '', display_order: 0, active: true })} className="flex-1">
                      Cancelar
                    </Button>
                  )}
                  <Button onClick={handleSaveCategory} className="flex-[2] bg-brand-500 hover:bg-brand-600" isLoading={isLoading} disabled={!editingCategory.name}>
                    <Save size={18} /> {editingCategory.id ? 'Atualizar Categoria' : 'Salvar Categoria'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
              <h3 className="font-bold text-stone-800">Categorias Cadastradas</h3>
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-center text-stone-400 py-4">Nenhuma categoria encontrada.</p>
                ) : (
                  categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 bg-stone-50 hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-xl">
                          {c.emoji || '📦'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-stone-800">{c.name}</p>
                          <p className="text-[10px] text-stone-500">Ordem: {c.display_order}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingCategory(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="p-2 text-stone-400 hover:text-brand-500 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <LogOut size={16} className="rotate-180" /> {/* Using LogOut as Delete icon since Trash is not imported */}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 relative">
              {showSettingsSuccess && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 size={16} /> Salvo com sucesso!
                </div>
              )}
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-stone-800"><Settings size={20} className="text-brand-500" /> Configurações da Loja</h3>

              <div className="space-y-5">
                <Input
                  label="Taxa de Entrega (R$)"
                  type="number"
                  step="0.10"
                  value={settings.deliveryFee}
                  onChange={(e: any) => setSettings({ ...settings, deliveryFee: parseFloat(e.target.value) })}
                />

                <Input
                  label="Pedido Mínimo (R$)"
                  type="number"
                  step="1.00"
                  value={settings.minOrderValue}
                  onChange={(e: any) => setSettings({ ...settings, minOrderValue: parseFloat(e.target.value) })}
                />

                <Input
                  label="Porcentagem de Cashback (Ex: 0.05 para 5%)"
                  type="number"
                  step="0.01"
                  value={settings.cashbackPercentage}
                  onChange={(e: any) => setSettings({ ...settings, cashbackPercentage: parseFloat(e.target.value) })}
                />

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800">
                  <p className="font-bold mb-1">Resumo das Taxas:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Entrega: {formatCurrency(settings.deliveryFee)}</li>
                    <li>Pedido Mínimo: {formatCurrency(settings.minOrderValue)}</li>
                    <li>Cashback: {(settings.cashbackPercentage * 100).toFixed(0)}% do valor dos produtos</li>
                  </ul>
                </div>

                <Button onClick={handleSaveSettings} className="w-full mt-4">
                  Salvar Configurações
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
