import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, register, error, setError } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setLocalError(error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setLocalError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
    } catch (err) {
      setLocalError(error || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          padding: '40px 20px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            margin: '0 0 10px 0',
            letterSpacing: '-0.5px'
          }}>PersonalPro</h1>
          <p style={{
            fontSize: '14px',
            margin: '0',
            opacity: '0.9'
          }}>Gestão para Personal Trainers</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <button
            onClick={() => { setTab('login'); setLocalError(''); setError(null); }}
            style={{
              flex: 1,
              padding: '16px',
              background: tab === 'login' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: tab === 'login' ? '3px solid #7c3aed' : 'none',
              color: tab === 'login' ? '#7c3aed' : '#9ca3af',
              fontSize: '14px',
              fontWeight: tab === 'login' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab('register'); setLocalError(''); setError(null); }}
            style={{
              flex: 1,
              padding: '16px',
              background: tab === 'register' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: tab === 'register' ? '3px solid #7c3aed' : 'none',
              color: tab === 'register' ? '#7c3aed' : '#9ca3af',
              fontSize: '14px',
              fontWeight: tab === 'register' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Registrar
          </button>
        </div>

        {/* Form Content */}
        <div style={{
          padding: '30px 20px'
        }}>
          {displayError && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              border: '1px solid #fecaca'
            }}>
              {displayError}
            </div>
          )}

          <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '6px'
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'auto'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed';
                  e.target.style.outline = 'none';
                  e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '6px'
              }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'auto'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed';
                  e.target.style.outline = 'none';
                  e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.8 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = 'none';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {loading ? 'Processando...' : (tab === 'login' ? 'Entrar' : 'Registrar')}
            </button>
          </form>

          {tab === 'login' && (
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              marginTop: '16px',
              textAlign: 'center'
            }}>
              Não tem conta? Clique em "Registrar" acima.
            </p>
          )}
          {tab === 'register' && (
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              marginTop: '16px',
              textAlign: 'center'
            }}>
              Já tem conta? Clique em "Entrar" acima.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
