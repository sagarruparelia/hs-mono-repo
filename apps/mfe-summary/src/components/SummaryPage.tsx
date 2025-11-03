import { useState, useEffect } from 'react';
import './SummaryPage.css';

export interface SummaryPageProps {
  userId?: string;
  theme?: 'light' | 'dark';
  timeRange?: 'week' | 'month' | 'year';
  onDataLoad?: (data: any) => void;
}

interface SummaryData {
  totalActivities: number;
  completedTasks: number;
  activeProjects: number;
  teamMembers: number;
  recentActivities: Array<{ id: number; title: string; date: string; type: string }>;
}

export function SummaryPage({
  userId = 'demo-user',
  theme = 'light',
  timeRange = 'month',
  onDataLoad
}: SummaryPageProps) {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalActivities: 156,
    completedTasks: 89,
    activeProjects: 12,
    teamMembers: 8,
    recentActivities: [
      { id: 1, title: 'Completed dashboard redesign', date: '2025-01-10', type: 'task' },
      { id: 2, title: 'Updated API documentation', date: '2025-01-09', type: 'documentation' },
      { id: 3, title: 'Code review for feature-auth', date: '2025-01-08', type: 'review' },
      { id: 4, title: 'Team meeting notes published', date: '2025-01-07', type: 'meeting' },
      { id: 5, title: 'Performance optimization PR merged', date: '2025-01-06', type: 'code' },
    ],
  });

  const [selectedRange, setSelectedRange] = useState(timeRange);

  useEffect(() => {
    onDataLoad?.(summaryData);
  }, [summaryData, onDataLoad]);

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

  const getCompletionRate = () => {
    return Math.round((summaryData.completedTasks / summaryData.totalActivities) * 100);
  };

  return (
    <div className={`summary-page summary-page--${theme}`} data-user-id={userId}>
      <div className="summary-header">
        <h1>Activity Summary</h1>
        <div className="time-range-selector">
          <button
            className={selectedRange === 'week' ? 'active' : ''}
            onClick={() => setSelectedRange('week')}
          >
            Week
          </button>
          <button
            className={selectedRange === 'month' ? 'active' : ''}
            onClick={() => setSelectedRange('month')}
          >
            Month
          </button>
          <button
            className={selectedRange === 'year' ? 'active' : ''}
            onClick={() => setSelectedRange('year')}
          >
            Year
          </button>
        </div>
      </div>

      <div className="summary-metrics">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>Total Activities</h3>
            <p className="metric-value">{summaryData.totalActivities}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Completed Tasks</h3>
            <p className="metric-value">{summaryData.completedTasks}</p>
            <p className="metric-subtext">{getCompletionRate()}% completion rate</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📁</div>
          <div className="metric-content">
            <h3>Active Projects</h3>
            <p className="metric-value">{summaryData.activeProjects}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Team Members</h3>
            <p className="metric-value">{summaryData.teamMembers}</p>
          </div>
        </div>
      </div>

      <div className="recent-activities">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {summaryData.recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <span className="activity-icon">{getActivityIcon(activity.type)}</span>
              <div className="activity-details">
                <p className="activity-title">{activity.title}</p>
                <p className="activity-date">{new Date(activity.date).toLocaleDateString()}</p>
              </div>
              <span className={`activity-badge activity-badge--${activity.type}`}>
                {activity.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

export default SummaryPage;
