import React, { useState } from 'react';
import { ViewState } from './types';
import { UserProvider, useUser } from './contexts/UserContext';
import { ProductProvider } from './contexts/ProductContext';
import { OrderProvider, useOrder } from './contexts/OrderContext';

// Views
import { LoginView } from './views/LoginView';
import { ShopView } from './views/ShopView';
import { CartView } from './views/CartView';
import { OrderTrackingView, SuccessView } from './views/OrderTrackingView';
import { ProfileView } from './views/ProfileView';
import { ChatView } from './views/ChatView';
import { AdminView } from './views/AdminView';
import { BottomNav } from './components/BottomNav';

// Router Component to handle view switching
const AppRouter = () => {
  const [currentView, setCurrentView] = useState<ViewState>('shop');
  const { earnedCashback } = useOrder();
  const { isLoading } = useUser();

  const showBottomNav = ['shop', 'order-tracking', 'profile', 'chat'].includes(currentView);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen">
      {currentView === 'login' && <LoginView setCurrentView={setCurrentView} />}
      {currentView === 'shop' && <ShopView setCurrentView={setCurrentView} />}
      {currentView === 'cart' && <CartView setCurrentView={setCurrentView} />}
      {currentView === 'order-success' && <SuccessView earnedCashback={earnedCashback} setCurrentView={setCurrentView} />}
      {currentView === 'profile' && <ProfileView setCurrentView={setCurrentView} />}
      {currentView === 'chat' && <ChatView setCurrentView={setCurrentView} />}
      {currentView === 'order-tracking' && <OrderTrackingView setCurrentView={setCurrentView} />}
      {currentView === 'admin' && <AdminView setCurrentView={setCurrentView} />}

      {showBottomNav && <BottomNav currentView={currentView} setCurrentView={setCurrentView} />}
    </div>
  );
};

// Main App with Providers
export default function App() {
  return (
    <UserProvider>
      <ProductProvider>
        <OrderProvider>
          <AppRouter />
        </OrderProvider>
      </ProductProvider>
    </UserProvider>
  );
}