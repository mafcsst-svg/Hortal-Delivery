import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CartItem, Order, Message, Product, OrderStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { useUser } from './UserContext';
import { useProducts } from './ProductContext';
import { chatWithChefHortal } from '../services/geminiService';

interface OrderContextType {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  earnedCashback: number;
  setEarnedCashback: React.Dispatch<React.SetStateAction<number>>;
  addToCart: (product: Product, quantity: number) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  updateObservation: (id: string, obs: string) => void;
  clearCart: () => void;
  refreshOrders: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderRating: (orderId: string, rating: number, comment?: string, skipped?: boolean) => Promise<void>;
  sendMessage: (text: string, customerId?: string) => Promise<void>;
  isRealtimeConnected: boolean;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { products } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const channelRef = useRef<any>(null);
  const messageChannelRef = useRef<any>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Keep messages in localStorage for now
  const [messages, setMessages] = useState<Message[]>([]);

  const [earnedCashback, setEarnedCashback] = useState(0);

  const updateOrderRating = async (orderId: string, rating: number, comment?: string, skipped?: boolean) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          rating,
          rating_comment: comment,
          rating_skipped: skipped
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, rating, ratingComment: comment, ratingSkipped: skipped } : o));
    } catch (err) {
      console.error('Error updating order rating:', err);
      throw err;
    }
  };

  const fetchOrders = async () => {
    if (!user) {
      setOrders([]);
      return;
    }

    try {
      let query = supabase
        .from('orders')
        .select('*, order_items(*)');

      // If not admin, filter by customer_id
      if (user.role !== 'admin') {
        query = query.eq('customer_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedOrders: Order[] = data.map((o: any) => ({
          id: o.id,
          customer_id: o.customer_id,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          address: o.address,
          date: o.created_at,
          items: o.order_items.map((i: any) => ({
            id: i.product_id,
            name: i.name,
            price: Number(i.price),
            quantity: i.quantity,
            observation: i.observation,
            image: i.image,
            category: 'panificacao' // Default or could be saved in items
          })),
          subtotal: Number(o.subtotal),
          total: Number(o.total),
          deliveryFee: Number(o.delivery_fee),
          paymentMethod: o.payment_method,
          paymentDetail: o.payment_detail,
          status: o.status as OrderStatus,
          deliveryCode: o.delivery_code,
          rating: o.rating,
          ratingComment: o.rating_comment,
          ratingSkipped: o.rating_skipped,
          cashbackEarned: Number(o.cashback_earned) || 0
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const fetchMessages = async () => {
    if (!user) return;
    try {
      let query = supabase.from('messages').select('*');
      if (user.role !== 'admin') {
        query = query.eq('customer_id', user.id);
      }
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          customerId: m.customer_id,
          text: m.text,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAdmin: m.is_admin,
          createdAt: m.created_at
        })));
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const sendMessage = async (text: string, customerId?: string) => {
    if (!user) return;
    const targetCustomerId = customerId || user.id;

    // Criar mensagem otimista para exibição imediata
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      senderId: user.id,
      senderName: user.role === 'admin' ? 'Padaria Hortal' : user.name,
      customerId: targetCustomerId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: user.role === 'admin',
      createdAt: new Date().toISOString()
    };

    // Adicionar mensagem imediatamente na UI
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: user.id,
        customer_id: targetCustomerId,
        text,
        is_admin: user.role === 'admin',
        sender_name: user.role === 'admin' ? 'Padaria Hortal' : user.name
      }).select().single();

      if (error) throw error;

      // Substituir mensagem otimista pela mensagem real do banco
      if (data) {
        const realMessage: Message = {
          id: data.id,
          senderId: data.sender_id,
          senderName: data.sender_name,
          customerId: data.customer_id,
          text: data.text,
          timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAdmin: data.is_admin,
          createdAt: data.created_at
        };

        setMessages(prev => prev.map(m => m.id === optimisticId ? realMessage : m));

        // --- NEW: AI RESPONSE LOGIC ---
        // If it's a customer sending a message and it's not an admin reply
        if (user.role !== 'admin') {
          try {
            const aiResponseText = await chatWithChefHortal(text, products);

            // Insert AI message into database
            const { data: aiData, error: aiError } = await supabase.from('messages').insert({
              sender_id: 'chef-hortal-ai',
              customer_id: user.id,
              text: aiResponseText,
              is_admin: true,
              sender_name: 'Chef Hortal 🥖'
            }).select().single();

            if (!aiError && aiData) {
              const aiMessage: Message = {
                id: aiData.id,
                senderId: aiData.sender_id,
                senderName: aiData.sender_name,
                customerId: aiData.customer_id,
                text: aiData.text,
                timestamp: new Date(aiData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isAdmin: true,
                createdAt: aiData.created_at
              };

              // Broadcast AI message
              if (messageChannelRef.current) {
                await messageChannelRef.current.send({
                  type: 'broadcast',
                  event: 'new_message',
                  payload: aiMessage
                });
              }
            }
          } catch (aiErr) {
            console.error('Error triggering Chef Hortal AI:', aiErr);
          }
        }
        // --- END AI RESPONSE LOGIC ---

        // Broadcast instantâneo usando canal persistente
        if (messageChannelRef.current) {
          try {
            await messageChannelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: realMessage
            });
            console.log('Message Broadcast Sent via persistent channel:', realMessage.text);
          } catch (broadcastErr) {
            console.warn('Broadcast failed, relying on postgres_changes:', broadcastErr);
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Remover mensagem otimista em caso de erro
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      throw err;
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMessages();

    // 1. Subscribe to Postgres Changes for Orders
    const dbChannel = supabase
      .channel('db-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Postgres Change Order:', payload.eventType);
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new;
            setOrders(prev => prev.map(o => o.id === updated.id ? {
              ...o,
              status: updated.status as OrderStatus,
              deliveryCode: updated.delivery_code || o.deliveryCode
            } : o));
          } else {
            fetchOrders();
          }
        }
      )
      .subscribe((status) => {
        console.log('Orders Realtime Channel Status:', status);
        if (status === 'SUBSCRIBED') setIsRealtimeConnected(true);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsRealtimeConnected(false);
      });

    // 2. Subscribe to Messages Changes via postgres_changes (REALTIME PRIMARY)
    const msgChannel = supabase
      .channel('db-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('🔴 Postgres Realtime Message INSERT:', payload.new);
          const m = payload.new as any;

          // Filtrar por customer_id se não for admin
          if (user?.role !== 'admin' && m.customer_id !== user?.id) {
            return;
          }

          const newMessage: Message = {
            id: m.id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            customerId: m.customer_id,
            text: m.text,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAdmin: m.is_admin,
            createdAt: m.created_at
          };

          setMessages(prev => {
            // Evitar duplicatas (pode já ter sido adicionada como mensagem otimista)
            const exists = prev.find(existing =>
              existing.id === newMessage.id ||
              (existing.id.startsWith('temp-') &&
                existing.text === newMessage.text &&
                existing.senderId === newMessage.senderId)
            );
            if (exists) {
              // Substituir mensagem temporária pela real
              if (exists.id.startsWith('temp-')) {
                return prev.map(m => m.id === exists.id ? newMessage : m);
              }
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Messages Realtime Channel Status:', status);
      });

    // 3. Subscribe to Broadcast for Orders (Instant Soft Sync)
    const syncChannel = supabase
      .channel('orders-sync')
      .on('broadcast', { event: 'order_status_sync' }, ({ payload }) => {
        console.log('Broadcast Status Received:', payload);
        const { orderId, status } = payload;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      })
      .on('broadcast', { event: 'new_order' }, () => {
        console.log('Broadcast New Order Received!');
        fetchOrders();
      })
      .subscribe();

    // 4. Persistent Broadcast Channel for Messages (backup for instant sync)
    const messagesSyncChannel = supabase
      .channel('messages-broadcast-sync')
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        console.log('🟢 Broadcast New Message Received!', payload);
        const newMessage = payload as Message;

        // Filtrar por customer_id se não for admin
        if (user?.role !== 'admin' && newMessage.customerId !== user?.id) {
          return;
        }

        setMessages(prev => {
          // Evitar duplicatas
          if (prev.find(m => m.id === newMessage.id)) return prev;
          // Também verificar mensagens temporárias
          const tempMatch = prev.find(m =>
            m.id.startsWith('temp-') &&
            m.text === newMessage.text &&
            m.senderId === newMessage.senderId
          );
          if (tempMatch) {
            return prev.map(m => m.id === tempMatch.id ? newMessage : m);
          }
          return [...prev, newMessage];
        });
      })
      .subscribe((status) => {
        console.log('Messages Broadcast Channel Status:', status);
      });

    channelRef.current = syncChannel;
    messageChannelRef.current = messagesSyncChannel;

    // 5. Fallback: Polling every 15s for messages (both admin and client when chat is active)
    const messageInterval = setInterval(() => {
      console.log('Message Polling Refresh...');
      fetchMessages();
    }, 15000);

    // 6. Fallback: Polling every 30s for orders (admin only)
    let orderInterval: any = null;
    if (user?.role === 'admin') {
      orderInterval = setInterval(() => {
        console.log('Admin Orders Polling Refresh...');
        fetchOrders();
      }, 30000);
    }

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(syncChannel);
      supabase.removeChannel(messagesSyncChannel);
      channelRef.current = null;
      messageChannelRef.current = null;
      clearInterval(messageInterval);
      if (orderInterval) clearInterval(orderInterval);
    };
  }, [user?.id, user?.role]);

  // Removed localStorage sync for messages as we use Supabase now

  const addToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev.map(item => {
        if (item.id === id) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const updateObservation = (id: string, obs: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, observation: obs } : item));
  };

  const clearCart = () => setCart([]);

  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Broadcast via the EXISTING stable sync channel
      const activeChannel = channelRef.current || supabase.channel('orders-sync');

      // Ensure the channel is subscribed if we just created it
      if (!channelRef.current) {
        activeChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await activeChannel.send({
              type: 'broadcast',
              event: 'order_status_sync',
              payload: { orderId, status: nextStatus }
            });
            console.log('Instant Sync Broadcast Sent (delayed) for:', nextStatus);
          }
        });
      } else {
        await activeChannel.send({
          type: 'broadcast',
          event: 'order_status_sync',
          payload: { orderId, status: nextStatus }
        });
        console.log('Instant Sync Broadcast Sent for:', nextStatus);
      }

      await fetchOrders();
    } catch (err: any) {
      console.error('Error updating status:', err);
      await fetchOrders();
      throw err;
    }
  };

  return (
    <OrderContext.Provider value={{
      cart, setCart,
      orders, setOrders,
      messages, setMessages,
      earnedCashback, setEarnedCashback,
      addToCart, updateCartQuantity, updateObservation, clearCart,
      refreshOrders: fetchOrders,
      refreshMessages: fetchMessages,
      updateOrderStatus,
      updateOrderRating,
      sendMessage,
      isRealtimeConnected
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within an OrderProvider');
  return context;
};
