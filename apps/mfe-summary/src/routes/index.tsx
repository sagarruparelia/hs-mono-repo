import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useSummary } from '../hooks/useSummary';

export const Route = createFileRoute('/')({
  component: OverviewComponent,
});

interface OverviewProps {
  userId?: string;
  theme?: 'light' | 'dark';
  onDataLoad?: (data: any) => void;
}

function OverviewComponent() {
  // Get context from router or use defaults
  const context = Route.useRouteContext() as OverviewProps;
  const { userId = 'demo-user', theme = 'light', onDataLoad } = context || {};

  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'year'>('month');

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

  if (isLoading) {
    return (
      <div className={`summary-loading summary-page--${theme}`}>
        <div className="spinner"></div>
        <p>Loading summary data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`summary-error summary-page--${theme}`}>
        <h2>Error Loading Summary</h2>
        <p>{error?.message || 'Failed to load summary data'}</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`summary-empty summary-page--${theme}`}>
        <p>No summary data available</p>
      </div>
    );
  }

  return (
    <div className={`summary-overview summary-page--${theme}`} data-user-id={userId}>
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

      <div className="summary-footer">
        <p>Last updated: {summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
  );
}
