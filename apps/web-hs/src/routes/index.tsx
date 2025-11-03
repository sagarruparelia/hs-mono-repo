import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAuth } from '@hs-mono-repo/shared-auth';
import LandingPage from '../app/pages/LandingPage';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect authenticated users to dashboard
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
