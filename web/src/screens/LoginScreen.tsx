import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import type { AppConfig } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import './LoginScreen.css';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sign-up is offered only when the server says it's open
  // (ALLOW_REGISTRATION); until that answer arrives it stays hidden.
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<AppConfig>('/api/config'),
    staleTime: Infinity,
    retry: false,
  });
  const canRegister = config?.allowRegistration === true;
  const isRegister = mode === 'register' && canRegister;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Introduce tu email y contraseña');
      return;
    }
    if (isRegister && password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password, email.split('@')[0]);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(errorMessage(err, 'Algo ha ido mal'));
      setSubmitting(false);
    }
  };

  return (
    <div className="screen login-screen">
      <form className="login-wrap" onSubmit={submit} noValidate>
        <div className="login-logo" aria-hidden="true">
          P
        </div>

        <div>
          <h1 className="login-title">{isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
          <p className="login-sub">{isRegister ? 'Empieza a puntuar lo que quieras' : 'Accede para ver tus puntuaciones'}</p>
        </div>

        <label className="login-field">
          <span className="login-label">Email</span>
          <input
            className="login-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="tucorreo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="login-field">
          <span className="login-label">Contraseña</span>
          <input
            className="login-input"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {isRegister && (
          <label className="login-field">
            <span className="login-label">Confirmar contraseña</span>
            <input
              className="login-input"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}

        {!!error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary login-btn" disabled={submitting}>
          {submitting ? <span className="spinner small on-accent" aria-label="Enviando" /> : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>

        {canRegister && (
          <p className="login-switch">
            {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <button
              type="button"
              className="login-switch-action"
              onClick={() => {
                setError('');
                setMode(isRegister ? 'login' : 'register');
              }}
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>
        )}
      </form>
    </div>
  );
}
