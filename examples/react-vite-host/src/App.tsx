import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import './App.css';

// Lazy load MFE components
const ProfilePage = lazy(() =>
  import('mfe_profile/ProfilePage').catch((error) => {
    console.error('Failed to load ProfilePage:', error);
    return {
      default: () => (
        <div className="error">
          <h3>Failed to load Profile MFE</h3>
          <p>{error.message}</p>
        </div>
      ),
    };
  })
);

const SummaryPage = lazy(() =>
  import('mfe_summary/SummaryPage').catch((error) => {
    console.error('Failed to load SummaryPage:', error);
    return {
      default: () => (
        <div className="error">
          <h3>Failed to load Summary MFE</h3>
          <p>{error.message}</p>
        </div>
      ),
    };
  })
);

function LoadingSpinner() {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Loading MFE...</p>
    </div>
  );
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="error" role="alert">
      <h3>Something went wrong:</h3>
      <pre>{error.message}</pre>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🏠 Host Application</h1>
        <p>Consuming MFEs from CDN</p>
      </header>

      <main className="app-main">
        <section className="mfe-section">
          <h2>Profile MFE</h2>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingSpinner />}>
              <ProfilePage />
            </Suspense>
          </ErrorBoundary>
        </section>

        <section className="mfe-section">
          <h2>Summary MFE</h2>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingSpinner />}>
              <SummaryPage />
            </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      <footer className="app-footer">
        <p>React + Vite + Module Federation Example</p>
      </footer>
    </div>
  );
}

export default App;
