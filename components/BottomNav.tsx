import React from 'react';
import { Store, ClipboardList, MessageSquare, User, LogIn } from 'lucide-react';
import { ViewState } from '../types';
import { useOrder } from '../contexts/OrderContext';
import { useUser } from '../contexts/UserContext';

interface BottomNavProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
}

export const BottomNav = ({ currentView, setCurrentView }: BottomNavProps) => {
  const { orders } = useOrder();
  const { user } = useUser();
  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;

  const handleNav = (view: ViewState) => {
    if (!user && view !== 'shop') {
      setCurrentView('login');
    } else {
      setCurrentView(view);
    }
  };

  const navItems = [
    { id: 'shop', label: 'Início', icon: Store },
    { id: 'order-tracking', label: 'Pedidos', icon: ClipboardList, badge: activeOrdersCount },
    { id: 'chat', label: 'Chef Hortal', icon: MessageSquare },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-200 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id as ViewState)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-brand-500' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <div className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};