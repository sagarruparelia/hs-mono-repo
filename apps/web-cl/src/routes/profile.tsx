import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: ProfileComponent,
});

function ProfileComponent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="mfe-wrapper">
        <ProfilePage
          theme="light"
          onUpdate={(data) => console.log('Profile updated:', data)}
        />
      </div>
    </Suspense>
  );
}
