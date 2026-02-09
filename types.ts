export type Role = 'customer' | 'admin';

export interface Address {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Added for persistence logic
  phone?: string;
  cpf?: string;
  birthDate?: string;
  address?: Address;
  role: Role;
  cashbackBalance: number;
  orderHistory: Order[];
}


export interface Category {
  id: string;
  name: string;
  emoji: string;
  display_order: number;
  active: boolean;
}

export type ProductCategory = string;


export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image: string;
  oldPrice?: number;
  active?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  observation?: string;
}

export type OrderStatus = 'received' | 'preparing' | 'delivery' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customer_id?: string;
  customerName: string;
  customerPhone: string;
  address: Address;
  date: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  deliveryFee: number;
  paymentMethod: 'pix' | 'money' | 'card';
  paymentDetail?: string; // e.g., 'crédito', 'troco para 50'
  status: OrderStatus;
  deliveryCode: string; // 4-digit code
  rating?: number;
  ratingComment?: string;
  ratingSkipped?: boolean;
  cashbackEarned?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  customerId: string;
  text: string;
  timestamp: string;
  isAdmin: boolean;
  createdAt?: string;
}

export interface AppSettings {
  deliveryFee: number;
  minOrderValue: number;
  cashbackPercentage: number;
}

export type ViewState = 'login' | 'register' | 'shop' | 'cart' | 'profile' | 'admin' | 'order-tracking' | 'chat' | 'order-success';