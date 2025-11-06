import React, { useState } from 'react';
import { login } from '../services/api';

interface Props { onLogin: (token: string) => void; }

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const token = await login(username, password);
      onLogin(token);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="login-panel">
      <h2>KanbanX Login</h2>
      <form onSubmit={handleSubmit}>
        <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      <p className="hint">Default admin credentials prefilled.</p>
    </div>
  );
};

export default Login;
