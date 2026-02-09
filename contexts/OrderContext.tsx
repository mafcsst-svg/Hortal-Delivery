import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Order, Message, Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { useUser } from './UserContext';

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
  updateOrderStatus: (orderId: string, nextStatus: any) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Keep messages in localStorage for now
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('hortal_messages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const [earnedCashback, setEarnedCashback] = useState(0);

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
          status: o.status,
          deliveryCode: o.delivery_code,
          cashbackEarned: Number(o.cashback_earned)
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time order changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime Order Change:', payload.eventType, payload.new);

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setOrders(prev => prev.map(o => o.id === updated.id ? {
              ...o,
              status: updated.status,
              deliveryCode: updated.delivery_code || o.deliveryCode
            } : o));

            // If status is completed or cancelled, maybe fetch fresh to ensure cashback etc. is synced
            if (updated.status === 'completed' || updated.status === 'cancelled') {
              fetchOrders();
            }
          } else {
            // For INSERT or DELETE, re-fetch is safer to get relations (items)
            fetchOrders();
          }
        }
      )
      // Broadcast for ultra-fast "soft" sync (admin -> client)
      .on('broadcast', { event: 'order_status_sync' }, ({ payload }) => {
        console.log('Broadcast Sync Received:', payload);
        const { orderId, status } = payload;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    localStorage.setItem('hortal_messages', JSON.stringify(messages));
  }, [messages]);

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

  const updateOrderStatus = async (orderId: string, nextStatus: any) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Broadcast via the existing channel
      const channel = supabase.channel('schema-db-changes');
      await channel.send({
        type: 'broadcast',
        event: 'order_status_sync',
        payload: { orderId, status: nextStatus }
      });

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
      updateOrderStatus
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
