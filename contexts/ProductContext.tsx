import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../constants';
import { supabase } from '../services/supabaseClient';

interface ProductContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        setProducts(data);
      } else {
        // Seed if empty
        console.log('Producos não encontrados no DB, semeando...');
        await supabase.from('products').insert(INITIAL_PRODUCTS);
        setProducts(INITIAL_PRODUCTS);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Realtime Product Change:', payload);
          fetchProducts(); // Simple re-fetch for products since they are usually few
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ProductContext.Provider value={{ products, setProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within a ProductProvider');
  return context;
};
