import { createFileRoute } from '@tanstack/react-router';
import { useProfile } from '../hooks/useProfile';

export const Route = createFileRoute('/')({
  component: OverviewComponent,
});

interface OverviewProps {
  userId?: string;
  theme?: 'light' | 'dark';
}

function OverviewComponent() {
  const context = Route.useRouteContext() as OverviewProps;
  const { userId = 'demo-user', theme = 'light' } = context || {};

  const { profile, isLoading, isError, error } = useProfile(userId);

  if (isLoading) {
    return (
      <div className={`profile-loading profile-page--${theme}`}>
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`profile-error profile-page--${theme}`}>
        <h2>Error Loading Profile</h2>
        <p>{error?.message || 'Failed to load profile data'}</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`profile-empty profile-page--${theme}`}>
        <p>No profile data available</p>
      </div>
    );
  }

  return (
    <div className={`profile-overview profile-page--${theme}`} data-user-id={userId}>
      <div className="profile-header">
        <h1>Profile Overview</h1>
      </div>

      <div className="profile-content">
        <div className="profile-avatar">
          <img src={profile.avatar || 'https://via.placeholder.com/150'} alt="Profile" />
        </div>

        <div className="profile-details">
          <h2>{profile.name}</h2>
          <p className="profile-email">{profile.email}</p>
          <p className="profile-bio">{profile.bio}</p>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat">
          <span className="stat-value">42</span>
          <span className="stat-label">Projects</span>
        </div>
        <div className="stat">
          <span className="stat-value">1.2K</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="stat">
          <span className="stat-value">850</span>
          <span className="stat-label">Following</span>
        </div>
      </div>
    </div>
  );
}
