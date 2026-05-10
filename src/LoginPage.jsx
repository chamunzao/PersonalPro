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
      background: '#252840',
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
                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '5px 0 0' }}>Agenda, treinos e recebimentos no mesmo lugar.</p>
              </div>
            </div>

            <p style={{ color: '#4A9EFF', fontSize: '12px', fontWeight: 900, margin: '0 0 10px' }}>PARA PERSONAL TRAINERS</p>
            <h2 style={{
              fontSize: 'clamp(34px, 6vw, 58px)',
              lineHeight: 0.98,
              margin: 0,
              color: '#FFFFFF',
              fontWeight: 700
            }}>
              Controle a aula sem perder o ritmo da aula.
            </h2>
            <p style={{ maxWidth: '560px', color: '#9CA3AF', fontSize: '16px', lineHeight: 1.55, margin: '20px 0 0' }}>
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
                background: '#1E2035',
                border: '0.5px solid #3D4270',
                borderRadius: '16px',
                padding: '14px'
              }}>
                <p style={{ margin: 0, color: '#4A9EFF', fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '12px', fontWeight: 500 }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-card" style={{ padding: '18px' }}>
          <div style={{ padding: '6px 6px 18px' }}>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>{isLogin ? 'Entrar no app' : 'Criar conta'}</h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
              {isLogin ? 'Acesse sua rotina de aulas.' : 'Comece com seu proprio espaco de trabalho.'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: '#1E2035',
            borderRadius: '16px',
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
                  borderRadius: '14px',
                  padding: '10px',
                  background: tab === key ? '#2E3154' : 'transparent',
                  color: tab === key ? '#FFFFFF' : '#6B7280',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: 'none'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {displayError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '12px', borderRadius: '14px', fontSize: '13px', marginBottom: '14px', border: '0.5px solid rgba(239,68,68,0.28)' }}>
              {displayError}
            </div>
          )}

          {successMessage && (
            <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '12px', borderRadius: '14px', fontSize: '13px', marginBottom: '14px', border: '0.5px solid rgba(16,185,129,0.28)' }}>
              {successMessage}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#9CA3AF', marginBottom: '6px' }}>E-mail</label>
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
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#9CA3AF' }}>Senha</label>
              {isLogin && (
                <button type="button" onClick={handleResetPassword} disabled={loading} style={{ border: 0, background: 'none', padding: 0, color: '#4A9EFF', fontSize: '12px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}>
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
                padding: '14px',
                minHeight: '48px',
                background: loading ? '#3D4270' : '#4A9EFF',
                color: '#FFFFFF',
                border: 0,
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: 'none'
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
                padding: '14px',
                minHeight: '48px',
                background: 'rgba(74, 158, 255, 0.15)',
                color: '#4A9EFF',
                border: '0.5px solid #3D4270',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: 500,
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
    minHeight: '44px',
    padding: '10px 14px',
    border: '0.5px solid #3D4270',
    borderRadius: '12px',
    fontSize: '14px',
    background: disabled ? '#1E2035' : '#2E3154',
    color: '#FFFFFF',
    opacity: disabled ? 0.7 : 1
  };
}
