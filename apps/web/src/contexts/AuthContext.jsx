import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (pb.authStore.isValid) {
      setCurrentUser(pb.authStore.model);
    }
    setInitialLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setCurrentUser(model);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkBlockedStatus = async (userId) => {
    try {
      const blockedRecord = await pb.collection('blocked_users').getFirstListItem(
        `user_id="${userId}" && is_active=true`, 
        { $autoCancel: false }
      );
      return blockedRecord;
    } catch (error) {
      // 404 means not found in blocked list, which is good
      if (error.status !== 404) {
        console.error('Error checking blocked status:', error);
      }
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      
      if (authData.record.is_frozen) {
        pb.authStore.clear();
        setCurrentUser(null);
        return { success: false, error: 'Esta cuenta ha sido congelada. Contacta al administrador.' };
      }

      const blockedRecord = await checkBlockedStatus(authData.record.id);
      if (blockedRecord) {
        pb.authStore.clear();
        setCurrentUser(null);
        return { success: false, error: `Usuario bloqueado: ${blockedRecord.reason || 'Sin motivo especificado'}` };
      }

      setCurrentUser(authData.record);
      return { success: true, user: authData.record };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginWithTelegram = async (telegramData) => {
    try {
      const response = await apiServerClient.fetch('/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Telegram authentication failed');
      }

      const data = await response.json();
      
      if (data.user.is_frozen) {
        return { success: false, error: 'Esta cuenta ha sido congelada. Contacta al administrador.' };
      }

      const blockedRecord = await checkBlockedStatus(data.user.id);
      if (blockedRecord) {
        return { success: false, error: `Usuario bloqueado: ${blockedRecord.reason || 'Sin motivo especificado'}` };
      }

      pb.authStore.save(data.authToken, data.user);
      setCurrentUser(data.user);
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Telegram login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async (email, password, passwordConfirm, name) => {
    try {
      const data = {
        email,
        password,
        passwordConfirm,
        name: name || '',
        role: 'user',
        is_frozen: false
      };
      
      const record = await pb.collection('users').create(data, { $autoCancel: false });
      
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      setCurrentUser(authData.record);
      
      return { success: true, user: record };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    loginWithTelegram,
    signup,
    logout,
    initialLoading
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};