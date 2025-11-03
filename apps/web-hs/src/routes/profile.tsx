import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: ProfileLayout,
});

function ProfileLayout() {
  return (
    <div className="profile-layout">
      {/* This renders child routes like /profile, /profile/settings, /profile/activity */}
      <Outlet />
    </div>
  );
}
