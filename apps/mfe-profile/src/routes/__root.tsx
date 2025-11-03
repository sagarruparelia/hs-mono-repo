import { createRootRoute, Outlet, Link } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import '../components/ProfilePage.css';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="profile-page">
      {/* Tab Navigation */}
      <nav className="profile-tabs">
        <Link
          to="/"
          activeProps={{ className: 'tab-active' }}
          activeOptions={{ exact: true }}
          className="tab"
        >
          Overview
        </Link>
        <Link
          to="/settings"
          activeProps={{ className: 'tab-active' }}
          className="tab"
        >
          Settings
        </Link>
        <Link
          to="/activity"
          activeProps={{ className: 'tab-active' }}
          className="tab"
        >
          Activity
        </Link>
      </nav>

      {/* Route Content */}
      <div className="profile-content">
        <Outlet />
      </div>

      {/* Dev tools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </div>
  );
}
