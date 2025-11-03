import { createFileRoute, redirect } from '@tanstack/react-router';
import DashboardPage from '../app/pages/DashboardPage';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: DashboardPage,
});
