import { useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@hs-mono-repo/shared-auth';
import './app.css';

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const isRouterPending = useRouterState({ select: (s) => s.isLoading });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={`app-container app-container--${theme}`}>
        <LoadingFallback />
      </div>
    );
  }

  return (
    <div className={`app-container app-container--${theme}`}>
      <header className="app-header">
        <div className="brand">
          <h1>Web CL Shell</h1>
          <span className="brand-badge">Client Portal</span>
        </div>
        <div className="header-actions">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'} Theme
          </button>
          {isAuthenticated && (
            <div className="user-info">
              <span className="user-name">{user?.name || user?.email}</span>
              <button onClick={logout} className="logout-btn">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {isAuthenticated && (
        <nav className="app-nav">
          <ul>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/profile">Profile</Link>
            </li>
            <li>
              <Link to="/summary">Summary</Link>
            </li>
          </ul>
        </nav>
      )}

      <main className="app-content">
        {isRouterPending ? <LoadingFallback /> : <Outlet />}
      </main>

      <footer className="app-footer">
        <p>
          Web CL Shell - Powered by Module Federation | Theme: {theme}
        </p>
      </footer>
    </div>
  );
}

export default App;
