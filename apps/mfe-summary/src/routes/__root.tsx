import { createRootRoute, Outlet, Link } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import '../components/SummaryPage.css';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="summary-page">
      {/* Tab Navigation */}
      <nav className="summary-tabs">
        <Link
          to="/"
          activeProps={{ className: 'tab-active' }}
          activeOptions={{ exact: true }}
          className="tab"
        >
          Overview
        </Link>
        <Link
          to="/details"
          activeProps={{ className: 'tab-active' }}
          className="tab"
        >
          Details
        </Link>
        <Link
          to="/analytics"
          activeProps={{ className: 'tab-active' }}
          className="tab"
        >
          Analytics
        </Link>
      </nav>

      {/* Route Content */}
      <div className="summary-content">
        <Outlet />
      </div>

      {/* Dev tools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </div>
  );
}
