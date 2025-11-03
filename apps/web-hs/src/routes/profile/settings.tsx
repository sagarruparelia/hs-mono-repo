import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const ProfilePageWithRouter = lazy(() => import('mfe_profile/ProfilePageWithRouter'));

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

export const Route = createFileRoute('/profile/settings')({
  component: ProfileSettingsComponent,
});

function ProfileSettingsComponent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="mfe-wrapper">
        <ProfilePageWithRouter
          route="/settings"
          theme="light"
          onRouteChange={(route) => {
            console.log('[Web HS] Profile MFE navigated to:', route);
          }}
          onUpdate={(data) => {
            console.log('[Web HS] Profile settings saved:', data);
          }}
        />
      </div>
    </Suspense>
  );
}
