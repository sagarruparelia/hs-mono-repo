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

export const Route = createFileRoute('/summary/details')({
  component: SummaryDetailsComponent,
});

function SummaryDetailsComponent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="mfe-wrapper">
        <SummaryPageWithRouter
          route="/details"
          theme="light"
          onRouteChange={(route) => {
            console.log('[Web HS] Summary MFE navigated to:', route);
          }}
          onDataLoad={(data) => {
            console.log('[Web HS] Details loaded:', data);
          }}
        />
      </div>
    </Suspense>
  );
}
