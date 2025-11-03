import { useAuth } from '@hs-mono-repo/shared-auth';
import './LandingPage.css';

/**
 * Public Landing Page
 *
 * Displayed to unauthenticated users.
 * Provides information about the application and login option.
 */
export function LandingPage() {
  const { login, isLoading } = useAuth();

  return (
    <div className="landing-page">
      <div className="hero-section">
        <h1 className="hero-title">Welcome to Web HS</h1>
        <p className="hero-subtitle">
          Your healthcare services portal for managing patients and accessing medical insights
        </p>

        <button
          onClick={() => login()}
          className="login-button"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Sign In to Continue'}
        </button>
      </div>

      <div className="features-section">
        <h2>What You Can Do</h2>
        <div className="feature-grid">
          <div className="feature-item">
            <div className="feature-icon">👤</div>
            <h3>Profile Management</h3>
            <p>View and update your personal information, preferences, and settings</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <h3>Patient Analytics</h3>
            <p>Access detailed patient summaries and medical insights</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">🔐</div>
            <h3>Secure Access</h3>
            <p>Your data is protected with industry-standard authentication</p>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h3>Getting Started</h3>
        <p>
          Click "Sign In to Continue" to authenticate with your credentials.
          You'll be redirected to our secure login provider.
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
