import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const SummaryPageWithRouter = lazy(() => import('mfe_summary/SummaryPageWithRouter'));

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

export const Route = createFileRoute('/summary/analytics')({
  component: SummaryAnalyticsComponent,
});

function SummaryAnalyticsComponent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="mfe-wrapper">
        <SummaryPageWithRouter
          route="/analytics"
          theme="light"
          onRouteChange={(route) => {
            console.log('[Web CL] Summary MFE navigated to:', route);
          }}
          onDataLoad={(data) => {
            console.log('[Web CL] Analytics loaded:', data);
          }}
        />
      </div>
    </Suspense>
  );
}
