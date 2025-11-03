import { createFileRoute } from '@tanstack/react-router';
import { useProfile } from '../hooks/useProfile';

export const Route = createFileRoute('/activity')({
  component: ActivityComponent,
});

interface ActivityProps {
  userId?: string;
  theme?: 'light' | 'dark';
}

function ActivityComponent() {
  const context = Route.useRouteContext() as ActivityProps;
  const { userId = 'demo-user', theme = 'light' } = context || {};

  const { profile, isLoading } = useProfile(userId);

  if (isLoading) {
    return (
      <div className={`profile-loading profile-page--${theme}`}>
        <div className="spinner"></div>
        <p>Loading activity...</p>
      </div>
    );
  }

  // Mock activity data
  const activities = [
    {
      id: 1,
      type: 'update',
      description: 'Updated profile information',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      type: 'login',
      description: 'Logged in from Chrome on MacOS',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      type: 'project',
      description: 'Created new project: Mobile App Redesign',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      type: 'connection',
      description: 'Connected with 3 new colleagues',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 5,
      type: 'settings',
      description: 'Updated notification preferences',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'update': return '✏️';
      case 'login': return '🔐';
      case 'project': return '📁';
      case 'connection': return '👥';
      case 'settings': return '⚙️';
      default: return '📌';
    }
  };

  return (
    <div className={`profile-activity profile-page--${theme}`}>
      <div className="profile-header">
        <h1>Recent Activity</h1>
        <p className="activity-subtitle">Your recent actions and updates</p>
      </div>

      <div className="activity-list">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <span className="activity-icon">{getActivityIcon(activity.type)}</span>
            <div className="activity-details">
              <p className="activity-description">{activity.description}</p>
              <p className="activity-timestamp">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
            <span className={`activity-badge activity-badge--${activity.type}`}>
              {activity.type}
            </span>
          </div>
        ))}
      </div>

      {profile && (
        <div className="activity-summary">
          <p>Total activities this month: <strong>23</strong></p>
          <p>Most active day: <strong>Monday</strong></p>
        </div>
      )}
    </div>
  );
}
