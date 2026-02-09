import { Product, AppSettings, User } from './types';

// App Identity
export const APP_NAME = "Padaria Hortal";
export const APP_SUBTITLE = "Pães e Salgados";

// Pointing to local file as requested. 
// User should save the image as 'logo.png' in the public/root directory.
export const APP_LOGO = "./logo.png"; 

export const INITIAL_SETTINGS: AppSettings = {
  deliveryFee: 8.50,
  minOrderValue: 20.00,
  cashbackPercentage: 0.05,
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Pão Italiano Rústico',
    description: 'Fermentação natural de 48h, casca crocante e miolo macio. 🥖',
    price: 18.90,
    category: 'panificacao',
    image: 'https://picsum.photos/400/400?random=1',
    active: true
  },
  {
    id: '2',
    name: 'Croissant de Amêndoas',
    description: 'Massa folhada amanteigada recheada com creme de amêndoas. 🥐',
    price: 12.50,
    category: 'confeitaria',
    image: 'https://picsum.photos/400/400?random=2',
    active: true
  },
  {
    id: '6',
    name: 'Hambúrguer Artesanal',
    description: 'Blend da casa 180g, queijo prato, alface, tomate e maionese especial no pão brioche. 🍔',
    price: 32.00,
    category: 'lanches',
    image: 'https://picsum.photos/400/400?random=6',
    active: true
  },
  {
    id: '3',
    name: 'Combo Café da Manhã',
    description: '2 Pães franceses, 100g de queijo, 100g de presunto e 1 suco de laranja. ☕',
    price: 25.90,
    oldPrice: 32.00,
    category: 'promocoes',
    image: 'https://picsum.photos/400/400?random=3',
    active: true
  },
  {
    id: '4',
    name: 'Suco de Laranja Natural',
    description: '500ml de suco espremido na hora. Sem açúcar. 🍊',
    price: 9.00,
    category: 'bebidas',
    image: 'https://picsum.photos/400/400?random=4',
    active: true
  },
  {
    id: '5',
    name: 'Queijo Minas Frescal',
    description: 'Peça de 500g, ideal para o café. 🧀',
    price: 28.00,
    category: 'mercearia',
    image: 'https://picsum.photos/400/400?random=5',
    active: true
  }
];

export const MOCK_ADMIN: User = {
  id: 'admin-01',
  name: 'Gerente Hortal',
  email: 'admin@hortal.com',
  role: 'admin',
  cashbackBalance: 0,
  orderHistory: [],
  address: {
      zipCode: '00000-000',
      street: 'Rua da Administração',
      number: '100',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP'
  }
};