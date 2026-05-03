import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
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
  if (error.code === 'auth/email-already-in-use') return 'E-mail ja cadastrado';
  if (error.code === 'auth/weak-password') return 'Senha muito fraca. Use no minimo 6 caracteres.';
  if (error.code === 'auth/invalid-email') return 'E-mail invalido';
  return 'Erro ao registrar: ' + error.message;
}

function getLoginMessage(error) {
  if (error.code === 'auth/user-not-found') return 'Usuario nao encontrado';
  if (error.code === 'auth/wrong-password') return 'Senha incorreta';
  if (error.code === 'auth/invalid-credential') return 'Senha incorreta';
  if (error.code === 'auth/invalid-email') return 'E-mail invalido';
  if (error.code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return 'Erro ao fazer login: ' + error.message;
}

function getResetPasswordMessage(error) {
  if (error.code === 'auth/user-not-found') return 'Usuario nao encontrado';
  if (error.code === 'auth/invalid-email') return 'E-mail invalido';
  if (error.userMessage) return error.userMessage;
  return 'Erro ao enviar redefinicao de senha: ' + error.message;
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
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        const notFoundError = new Error('Usuario nao encontrado');
        notFoundError.code = 'auth/user-not-found';
        throw notFoundError;
      }

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

      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        const notFoundError = new Error('Usuario nao encontrado');
        notFoundError.code = 'auth/user-not-found';
        throw notFoundError;
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
