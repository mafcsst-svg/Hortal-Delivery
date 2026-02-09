import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  updateUserProfile: (updatedUser: User) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('hortal_settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      deliveryFee: 8.50,
      minOrderValue: 20.00,
      cashbackPercentage: 0.05,
    };
  });

  // Fetch profile for the current authenticated user
  const fetchProfile = async (uid: string) => {
    console.log('Buscando perfil para UID:', uid);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        const mappedUser: User = {
          id: data.id,
          name: data.name || 'Cliente Hortal',
          email: '', // Email comes from auth.user, handled below
          phone: data.phone || '',
          cpf: data.cpf || '',
          role: data.role || 'customer',
          cashbackBalance: Number(data.cashback_balance) || 0,
          orderHistory: [],
          address: data.address || { zipCode: '', street: '', number: '', neighborhood: '', city: '', state: '' }
        };
        return mappedUser;
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
    return null;
  };

  // Fetch all user profiles (for admin)
  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        const mappedUsers: User[] = data.map(d => ({
          id: d.id,
          name: d.name || 'Cliente',
          email: '', // Email not directly in profile
          phone: d.phone || '',
          cpf: d.cpf || '',
          role: d.role || 'customer',
          cashbackBalance: Number(d.cashback_balance) || 0,
          orderHistory: [],
          address: d.address || { zipCode: '', street: '', number: '', neighborhood: '', city: '', state: '' }
        }));
        setAllUsers(mappedUsers);
      }
    } catch (err) {
      console.error('Error fetching all users:', err);
    }
  };

  // Sync Supabase Auth state with our global user context
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setUser({ ...profile, email: session.user.email || '' });
          if (profile.role === 'admin') {
            fetchAllUsers();
          }
        }
      } else {
        setUser(null);
        setAllUsers([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('hortal_settings', JSON.stringify(settings));
  }, [settings]);

  const updateUserProfile = async (updatedUser: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updatedUser.name,
          phone: updatedUser.phone,
          cpf: updatedUser.cpf,
          address: updatedUser.address,
          cashback_balance: updatedUser.cashbackBalance
        })
        .eq('id', updatedUser.id);

      if (error) throw error;
      setUser(updatedUser);
    } catch (err) {
      console.error('Error updating user profile:', err);
      alert('Erro ao atualizar perfil.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{
      user, setUser,
      allUsers, setAllUsers,
      settings, setSettings,
      updateUserProfile,
      logout
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};