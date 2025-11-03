import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/summary')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: SummaryLayout,
});

function SummaryLayout() {
  return (
    <div className="summary-layout">
      {/* This renders child routes like /summary/overview, /summary/details */}
      <Outlet />
    </div>
  );
}
