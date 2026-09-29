import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import AuthShell, { PasswordToggle } from '../components/AuthShell.jsx';
import { Alert, Field, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter your username or email and your password');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(identifier.trim(), password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue to your classes">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Alert>{error}</Alert>
        <Field label="Username or email" htmlFor="identifier">
          <input
            id="identifier"
            className="input"
            autoComplete="username"
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. kavindi or kavindi@gmail.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-16"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
          </div>
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4" />} Log in
        </button>
        <p className="text-center text-sm text-slate-500">
          New to TuitionHub?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
