import { Suspense, lazy, useState, useEffect } from 'react';
import { Route, Routes, Link, useNavigate, useLocation } from 'react-router';
import { useAuth, ProtectedRoute } from '@hs-mono-repo/shared-auth';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CallbackPage from './pages/CallbackPage';
import './app.css';

// Lazy load remote modules
const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));
const SummaryPage = lazy(() => import('mfe_summary/SummaryPage'));

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
  const navigate = useNavigate();
  const location = useLocation();

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Redirect logic: authenticated users on landing page -> dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

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
      <header className="app-header app-header--health">
        <div className="brand">
          <h1>Web HS Shell</h1>
          <span className="brand-badge">Health Services</span>
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
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public route - landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* OAuth callback route - public */}
            <Route path="/auth/callback" element={<CallbackPage />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <div className="mfe-wrapper">
                    <ProfilePage
                      theme={theme}
                      onUpdate={(data) => console.log('Profile updated:', data)}
                    />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary"
              element={
                <ProtectedRoute>
                  <div className="mfe-wrapper">
                    <SummaryPage
                      theme={theme}
                      onDataLoad={(data) => console.log('Summary loaded:', data)}
                    />
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>

      <footer className="app-footer">
        <p>
          Web HS Shell - Powered by Module Federation | Theme: {theme}
        </p>
      </footer>
    </div>
  );
}

export default App;
