import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../constants';

interface ProductContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa produtos do localStorage ou usa os iniciais
  const [products, setProducts] = useState<Product[]>(() => {
    const savedProducts = localStorage.getItem('hortal_products');
    return savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS;
  });

  // Salva no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('hortal_products', JSON.stringify(products));
  }, [products]);

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
