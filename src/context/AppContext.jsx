import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { mockUsers } from '../data/mock-users';
import { findUserByCredentials } from '../services/loginPolicy';
import { supabase } from '../services/supabaseClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((title, message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const syncUserProfile = async (profile) => {
    try {
      const { accessCode, ...safeProfile } = profile;
      await supabase.from('user_profiles').upsert({
        id: profile.id,
        tenant_id: profile.tenant_id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        tags: profile.tags || [profile.role?.toUpperCase()].filter(Boolean),
        status: profile.status || 'active',
        metadata: safeProfile,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (error) {
      console.warn('User profile sync failed:', error.message);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('kentauros_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      const refreshedUser = mockUsers.find(u => u.email === parsedUser.email);
      const nextUser = refreshedUser ? { ...parsedUser, ...refreshedUser } : parsedUser;
      setUser(nextUser);
      localStorage.setItem('kentauros_user', JSON.stringify(nextUser));
      syncUserProfile(nextUser);
    }
    setLoading(false);
  }, []);

  const login = (credentials) => {
    const foundUser = findUserByCredentials(mockUsers, credentials);

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('kentauros_user', JSON.stringify(foundUser));
      syncUserProfile(foundUser);
      addNotification('Sucesso', `Bem-vindo de volta, ${foundUser.name}!`, 'success');
      return true;
    }

    addNotification('Erro', 'Usuário não encontrado', 'error');
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kentauros_user');
  };

  return (
    <AppContext.Provider value={{ user, setUser, login, logout, loading, notifications, addNotification }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
