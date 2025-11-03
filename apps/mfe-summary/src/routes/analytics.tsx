import { createFileRoute } from '@tanstack/react-router';
import { useSummary } from '../hooks/useSummary';

export const Route = createFileRoute('/analytics')({
  component: AnalyticsComponent,
});

interface AnalyticsProps {
  userId?: string;
  theme?: 'light' | 'dark';
}

function AnalyticsComponent() {
  const context = Route.useRouteContext() as AnalyticsProps;
  const { userId = 'demo-user', theme = 'light' } = context || {};

  const {
    summary,
    isLoading,
  } = useSummary({
    userId,
    timeRange: 'year', // Yearly analytics
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className={`summary-loading summary-page--${theme}`}>
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  // Calculate analytics from summary data
  const activityTypes = summary?.recentActivities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalActivities = Object.values(activityTypes).reduce((a, b) => a + b, 0);

  return (
    <div className={`summary-analytics summary-page--${theme}`}>
      <div className="summary-header">
        <h1>Analytics Dashboard</h1>
        <p className="summary-subtitle">
          Insights and trends from your activity
        </p>
      </div>

      <div className="analytics-grid">
        {/* Activity Breakdown */}
        <div className="analytics-card">
          <h3>Activity Breakdown</h3>
          <div className="activity-breakdown">
            {Object.entries(activityTypes).map(([type, count]) => (
              <div key={type} className="breakdown-item">
                <span className="breakdown-label">{type}</span>
                <div className="breakdown-bar-container">
                  <div
                    className="breakdown-bar"
                    style={{
                      width: `${(count / totalActivities) * 100}%`,
                      backgroundColor: getTypeColor(type),
                    }}
                  />
                </div>
                <span className="breakdown-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="analytics-card">
          <h3>Key Metrics</h3>
          <div className="metrics-grid">
            {summary?.metrics.map((metric, index) => (
              <div key={index} className="metric-item">
                <p className="metric-label">{metric.label}</p>
                <p className="metric-value-large">
                  {metric.value}
                  {metric.unit && <span className="metric-unit">{metric.unit}</span>}
                </p>
                {metric.change !== undefined && (
                  <p className={`metric-trend metric-trend--${metric.trend || 'stable'}`}>
                    {metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : '→'}
                    {Math.abs(metric.change)}% {metric.trend}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total Activities */}
        <div className="analytics-card analytics-card--highlight">
          <h3>Total Activities</h3>
          <p className="stat-large">{totalActivities}</p>
          <p className="stat-label">activities this year</p>
        </div>
      </div>
    </div>
  );
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    task: '#4CAF50',
    documentation: '#2196F3',
    review: '#FF9800',
    meeting: '#9C27B0',
    code: '#F44336',
  };
  return colors[type] || '#757575';
}
