import { Suspense, lazy, useState } from 'react';
import { Route, Routes, Link } from 'react-router';
import './app.css';

// Lazy load remote modules
const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));
const SummaryPage = lazy(() => import('mfe_summary/SummaryPage'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading micro-frontend...</p>
    </div>
  );
}

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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
        </div>
      </header>

      <nav className="app-nav">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/profile">Profile (MFE)</Link>
          </li>
          <li>
            <Link to="/summary">Summary (MFE)</Link>
          </li>
        </ul>
      </nav>

      <main className="app-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <div className="home-page">
                  <h2>Welcome to Health Services Portal</h2>
                  <p>This is a shell application that hosts micro-frontends for healthcare professionals.</p>
                  <div className="feature-cards">
                    <div className="feature-card feature-card--health">
                      <h3>Patient Profile</h3>
                      <p>Dynamically loaded from mfe-profile micro-frontend</p>
                      <Link to="/profile" className="card-link card-link--health">
                        View Profile →
                      </Link>
                    </div>
                    <div className="feature-card feature-card--health">
                      <h3>Activity Summary</h3>
                      <p>Dynamically loaded from mfe-summary micro-frontend</p>
                      <Link to="/summary" className="card-link card-link--health">
                        View Summary →
                      </Link>
                    </div>
                  </div>
                </div>
              }
            />
            <Route
              path="/profile"
              element={
                <div className="mfe-wrapper">
                  <ProfilePage theme={theme} onUpdate={(data) => console.log('Profile updated:', data)} />
                </div>
              }
            />
            <Route
              path="/summary"
              element={
                <div className="mfe-wrapper">
                  <SummaryPage theme={theme} onDataLoad={(data) => console.log('Summary loaded:', data)} />
                </div>
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
