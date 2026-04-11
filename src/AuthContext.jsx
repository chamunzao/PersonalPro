import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged
} from './firebase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      const message = err.code === 'auth/email-already-in-use'
        ? 'Email já cadastrado'
        : err.code === 'auth/weak-password'
        ? 'Senha muito fraca (mínimo 6 caracteres)'
        : err.code === 'auth/invalid-email'
        ? 'Email inválido'
        : 'Erro ao registrar: ' + err.message;
      setError(message);
      throw err;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      const message = err.code === 'auth/user-not-found'
        ? 'Usuário não encontrado'
        : err.code === 'auth/wrong-password'
        ? 'Senha incorreta'
        : err.code === 'auth/invalid-email'
        ? 'Email inválido'
        : 'Erro ao fazer login: ' + err.message;
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      setError('Erro ao fazer logout: ' + err.message);
      throw err;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
