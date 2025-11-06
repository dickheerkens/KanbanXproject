import React, { useState } from 'react';
import Login from './components/Login';
import Board from './components/Board';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kanbanx_token'));

  function handleLogin(newToken: string) {
    localStorage.setItem('kanbanx_token', newToken);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem('kanbanx_token');
    setToken(null);
  }

  return (
    <div>
      {!token && <Login onLogin={handleLogin} />}
      {token && (
        <>
          <div className="session-bar">
            <span>Authenticated</span>
            <button onClick={logout}>Logout</button>
          </div>
          <Board token={token} />
        </>
      )}
    </div>
  );
};

export default App;
