import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const DEMO_EMAIL = 'demo.personalpro.20260504@personalpro.app';
const DEMO_PASSWORD = 'Demo@123456';

export function LoginPage() {
  const { login, register, resetPassword, error, setError } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function submitLogin(nextEmail = email, nextPassword = password) {
    setLocalError('');
    setSuccessMessage('');
    if (!nextEmail || !nextPassword) {
      setLocalError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await login(nextEmail, nextPassword);
    } catch (err) {
      setLocalError(err.userMessage || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    await submitLogin();
  };

  const handleDemoLogin = async () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    await submitLogin(DEMO_EMAIL, DEMO_PASSWORD);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    if (!email || !password) {
      setLocalError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setLocalError('Senha deve ter no minimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
    } catch (err) {
      setLocalError(err.userMessage || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLocalError('');
    setSuccessMessage('');
    if (!email) {
      setLocalError('Informe seu e-mail para redefinir a senha');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMessage('Enviamos um link de redefinicao de senha para seu e-mail.');
    } catch (err) {
      setLocalError(err.userMessage || 'Erro ao enviar redefinicao de senha');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;
  const isLogin = tab === 'login';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eef8f6 0%, #f7faf9 46%, #edf7f2 100%)',
      padding: '22px',
      display: 'grid',
      placeItems: 'center'
    }}>
      <div className="login-layout">
        <section className="app-card login-hero" style={{
          padding: '28px',
          minHeight: '560px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '34px' }}>
              <div className="app-brand-mark">PP</div>
              <div>
                <h1 style={{ fontSize: '26px', lineHeight: 1, fontWeight: 900, margin: 0 }}>PersonalPro</h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '5px 0 0' }}>Agenda, treinos e recebimentos no mesmo lugar.</p>
              </div>
            </div>

            <p style={{ color: '#0f766e', fontSize: '12px', fontWeight: 900, margin: '0 0 10px' }}>PARA PERSONAL TRAINERS</p>
            <h2 style={{
              fontSize: 'clamp(34px, 6vw, 58px)',
              lineHeight: 0.98,
              margin: 0,
              color: '#0f172a',
              fontWeight: 900
            }}>
              Controle a aula sem perder o ritmo da aula.
            </h2>
            <p style={{ maxWidth: '560px', color: '#475569', fontSize: '16px', lineHeight: 1.55, margin: '20px 0 0' }}>
              Veja quem treina agora, marque presenca, ajuste series e acompanhe pagamentos antes que virem pendencia.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            marginTop: '28px'
          }}>
            {[
              ['10', 'alunos demo'],
              ['5', 'aulas hoje'],
              ['60%', 'pagamentos']
            ].map(([value, label]) => (
              <div key={label} style={{
                background: '#f8faf9',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: '10px',
                padding: '14px'
              }}>
                <p style={{ margin: 0, color: '#0f766e', fontSize: '24px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-card" style={{ padding: '18px' }}>
          <div style={{ padding: '6px 6px 18px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#111827' }}>{isLogin ? 'Entrar no app' : 'Criar conta'}</h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
              {isLogin ? 'Acesse sua rotina de aulas.' : 'Comece com seu proprio espaco de trabalho.'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: '#f1f5f4',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '16px'
          }}>
            {[
              ['login', 'Entrar'],
              ['register', 'Registrar']
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setLocalError(''); setSuccessMessage(''); setError(null); }}
                style={{
                  border: 0,
                  borderRadius: '8px',
                  padding: '10px',
                  background: tab === key ? 'white' : 'transparent',
                  color: tab === key ? '#0f766e' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: tab === key ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {displayError && (
            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', border: '1px solid #fecaca' }}>
              {displayError}
            </div>
          )}

          {successMessage && (
            <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', border: '1px solid #a7f3d0' }}>
              {successMessage}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 850, color: '#334155', marginBottom: '6px' }}>E-mail</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              style={inputStyle(loading)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 850, color: '#334155' }}>Senha</label>
              {isLogin && (
                <button type="button" onClick={handleResetPassword} disabled={loading} style={{ border: 0, background: 'none', padding: 0, color: '#0f766e', fontSize: '12px', fontWeight: 850, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  Esqueci
                </button>
              )}
            </div>
            <input
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo 6 caracteres"
              disabled={loading}
              style={inputStyle(loading)}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '18px',
                padding: '12px',
                background: loading ? '#94a3b8' : '#0d9488',
                color: 'white',
                border: 0,
                borderRadius: '9px',
                fontSize: '14px',
                fontWeight: 900,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 10px 24px rgba(13, 148, 136, 0.18)'
              }}
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
            </button>
          </form>

          {isLogin && (
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '11px',
                background: '#ecfdf5',
                color: '#0f766e',
                border: '1px solid #a7f3d0',
                borderRadius: '9px',
                fontSize: '13px',
                fontWeight: 900,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Entrar na demo
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function inputStyle(disabled) {
  return {
    width: '100%',
    padding: '11px 12px',
    border: '1px solid rgba(15, 23, 42, 0.13)',
    borderRadius: '9px',
    fontSize: '14px',
    background: disabled ? '#f1f5f9' : 'white',
    color: '#111827',
    opacity: disabled ? 0.7 : 1
  };
}
