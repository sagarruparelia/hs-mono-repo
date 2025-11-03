import { useAuth } from '@hs-mono-repo/shared-auth';
import { Link } from 'react-router';
import './DashboardPage.css';

/**
 * Secure Dashboard Page
 *
 * Displayed to authenticated users after successful login.
 * Provides navigation to secure features (Profile, Summary).
 */
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <div className="welcome-section">
        <h1>Welcome back, {user?.name || user?.email}! 👋</h1>
        <p className="welcome-subtitle">
          Here's your personalized dashboard
        </p>
      </div>

      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">📧</div>
          <div className="stat-content">
            <div className="stat-label">Email</div>
            <div className="stat-value">{user?.email}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎭</div>
          <div className="stat-content">
            <div className="stat-label">Roles</div>
            <div className="stat-value">
              {user?.roles?.join(', ') || 'USER'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Status</div>
            <div className="stat-value">Active</div>
          </div>
        </div>
      </div>

      <div className="dashboard-features">
        <h2>Your Features</h2>
        <div className="feature-cards">
          <Link to="/profile" className="feature-card">
            <div className="feature-card-icon">👤</div>
            <h3>Profile</h3>
            <p>View and manage your personal information and preferences</p>
            <span className="feature-card-link">Go to Profile →</span>
          </Link>

          <Link to="/summary" className="feature-card">
            <div className="feature-card-icon">📊</div>
            <h3>Summary</h3>
            <p>View detailed analytics and insights about your account</p>
            <span className="feature-card-link">View Summary →</span>
          </Link>
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={logout} className="logout-button">
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default DashboardPage;
