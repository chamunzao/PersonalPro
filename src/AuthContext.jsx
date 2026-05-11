import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged
} from './firebase';

export const AuthContext = createContext();

function attachUserMessage(error, message) {
  error.userMessage = message;
  return error;
}

function getRegisterMessage(error) {
  if (error.code === 'auth/weak-password') return 'Senha muito fraca. Use no minimo 6 caracteres.';
  if (error.code === 'auth/invalid-email') return 'E-mail invalido';
  if (error.code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return 'Não foi possível registrar com estes dados.';
}

function getLoginMessage(error) {
  if (error.code === 'auth/invalid-email') return 'E-mail invalido';
  if (error.code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return 'E-mail ou senha incorretos.';
}

function getResetPasswordMessage(error) {
  if (error.code === 'auth/invalid-email') return 'E-mail invalido';
  if (error.userMessage) return error.userMessage;
  return 'Se este e-mail existir, enviaremos instrucoes de redefinicao.';
}

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
      const message = getRegisterMessage(err);
      setError(message);
      throw attachUserMessage(err, message);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      const message = getLoginMessage(err);
      setError(message);
      throw attachUserMessage(err, message);
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(null);
    try {
      if (!email) {
        const missingEmailError = new Error('Informe seu e-mail para redefinir a senha');
        throw attachUserMessage(missingEmailError, 'Informe seu e-mail para redefinir a senha');
      }

      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const message = getResetPasswordMessage(err);
      setError(message);
      throw attachUserMessage(err, message);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      const message = 'Erro ao fazer logout: ' + err.message;
      setError(message);
      throw attachUserMessage(err, message);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    register,
    login,
    resetPassword,
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
