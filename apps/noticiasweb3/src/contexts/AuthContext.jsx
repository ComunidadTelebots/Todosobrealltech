import { createContext, useContext, useEffect, useState } from 'react';
import pb from '../pb.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.isValid ? pb.authStore.model : null);

  useEffect(() => {
    return pb.authStore.onChange((token, model) => {
      setUser(model && pb.authStore.isValid ? model : null);
    });
  }, []);

  async function login(email, password) {
    const auth = await pb.collection('users').authWithPassword(email, password);
    setUser(auth.record);
    return auth;
  }

  function logout() {
    pb.authStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
