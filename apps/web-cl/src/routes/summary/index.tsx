import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

// Import the new routed version of SummaryPage
const SummaryPageWithRouter = lazy(() => import('mfe_summary/SummaryPageWithRouter'));

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

export const Route = createFileRoute('/summary/')({
  component: SummaryIndexComponent,
});

function SummaryIndexComponent() {
  return (
    <div className="summary-container">
      {/* MFE handles its own routing and navigation tabs */}
      <Suspense fallback={<LoadingFallback />}>
        <div className="mfe-wrapper">
          <SummaryPageWithRouter
            route="/"
            theme="light"
            onRouteChange={(route) => {
              console.log('[Web CL] Summary MFE navigated to:', route);
            }}
            onDataLoad={(data) => {
              console.log('[Web CL] Summary data loaded:', data);
            }}
          />
        </div>
      </Suspense>
    </div>
  );
}
