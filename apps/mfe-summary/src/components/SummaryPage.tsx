import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';
import { useSummary } from '../hooks/useSummary';
import './SummaryPage.css';

export interface SummaryPageProps {
  userId?: string;
  theme?: 'light' | 'dark';
  timeRange?: 'week' | 'month' | 'year';
  onDataLoad?: (data: any) => void;
}

function SummaryPageContent({
  userId = 'demo-user',
  theme = 'light',
  timeRange: initialTimeRange = 'month',
  onDataLoad
}: SummaryPageProps) {
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'year'>(initialTimeRange);

  const {
    summary,
    isLoading,
    isError,
    error,
    refreshSummary,
    isRefreshing,
  } = useSummary({
    userId,
    timeRange: selectedRange,
    limit: 10,
  });

  // Notify parent when data loads
  useEffect(() => {
    if (summary) {
      onDataLoad?.(summary);
    }
  }, [summary, onDataLoad]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className={`summary-page summary-page--${theme}`}>
        <div className="summary-loading">
          <div className="spinner"></div>
          <p>Loading summary data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={`summary-page summary-page--${theme}`}>
        <div className="summary-error">
          <h2>Error Loading Summary</h2>
          <p>{error?.message || 'Failed to load summary data'}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No summary data
  if (!summary) {
    return (
      <div className={`summary-page summary-page--${theme}`}>
        <div className="summary-empty">
          <p>No summary data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`summary-page summary-page--${theme}`} data-user-id={userId}>
      <div className="summary-header">
        <h1>Activity Summary</h1>
        <div className="time-range-selector">
          <button
            className={selectedRange === 'week' ? 'active' : ''}
            onClick={() => setSelectedRange('week')}
            disabled={isRefreshing}
          >
            Week
          </button>
          <button
            className={selectedRange === 'month' ? 'active' : ''}
            onClick={() => setSelectedRange('month')}
            disabled={isRefreshing}
          >
            Month
          </button>
          <button
            className={selectedRange === 'year' ? 'active' : ''}
            onClick={() => setSelectedRange('year')}
            disabled={isRefreshing}
          >
            Year
          </button>
          <button
            onClick={() => refreshSummary()}
            className="btn-refresh"
            disabled={isRefreshing}
          >
            {isRefreshing ? '⟳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="summary-metrics">
        {summary.metrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="metric-content">
              <h3>{metric.label}</h3>
              <p className="metric-value">
                {metric.value}
                {metric.unit && <span className="metric-unit">{metric.unit}</span>}
              </p>
              {metric.change !== undefined && (
                <p className={`metric-change metric-change--${metric.trend || 'stable'}`}>
                  {metric.change > 0 ? '+' : ''}{metric.change}% {metric.trend}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="recent-activities">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {summary.recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <span className="activity-icon">{getActivityIcon(activity.type)}</span>
              <div className="activity-details">
                <p className="activity-title">{activity.title}</p>
                <p className="activity-description">{activity.description}</p>
                <p className="activity-date">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
              <span className={`activity-badge activity-badge--${activity.type}`}>
                {activity.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-footer">
        <p>Last updated: {summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
  );
}

// Wrapper component that provides QueryClient
export function SummaryPage(props: SummaryPageProps) {
  const queryClient = getSharedQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SummaryPageContent {...props} />
    </QueryClientProvider>
  );
}

export default SummaryPage;
