import { createFileRoute } from '@tanstack/react-router';
import { useSummary } from '../hooks/useSummary';

export const Route = createFileRoute('/details')({
  component: DetailsComponent,
});

interface DetailsProps {
  userId?: string;
  theme?: 'light' | 'dark';
}

function DetailsComponent() {
  const context = Route.useRouteContext() as DetailsProps;
  const { userId = 'demo-user', theme = 'light' } = context || {};

  const {
    summary,
    isLoading,
    isError,
    error,
  } = useSummary({
    userId,
    timeRange: 'month',
    limit: 50, // More items for details view
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task': return '✓';
      case 'documentation': return '📄';
      case 'review': return '👁';
      case 'meeting': return '💬';
      case 'code': return '💻';
      default: return '•';
    }
  };

  if (isLoading) {
    return (
      <div className={`summary-loading summary-page--${theme}`}>
        <div className="spinner"></div>
        <p>Loading detailed activity...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`summary-error summary-page--${theme}`}>
        <h2>Error Loading Details</h2>
        <p>{error?.message || 'Failed to load detailed data'}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`summary-empty summary-page--${theme}`}>
        <p>No detailed data available</p>
      </div>
    );
  }

  return (
    <div className={`summary-details summary-page--${theme}`}>
      <div className="summary-header">
        <h1>Detailed Activity</h1>
        <p className="summary-subtitle">
          Showing {summary.recentActivities.length} recent activities
        </p>
      </div>

      <div className="recent-activities">
        <div className="activities-list">
          {summary.recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item activity-item--detailed">
              <span className="activity-icon">{getActivityIcon(activity.type)}</span>
              <div className="activity-details">
                <p className="activity-title">{activity.title}</p>
                <p className="activity-description">{activity.description}</p>
                <div className="activity-meta">
                  <span className="activity-date">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                  <span className={`activity-badge activity-badge--${activity.type}`}>
                    {activity.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
