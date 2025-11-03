import { StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import * as ReactDOM from 'react-dom/client';
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';
import { AuthProvider, useAuth } from '@hs-mono-repo/shared-auth';
import App from './app/app';
import { routeTree } from './routeTree.gen';

const queryClient = getSharedQueryClient();

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    isAuthenticated: false,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const { isAuthenticated } = useAuth();

  return <RouterProvider router={router} context={{ isAuthenticated }} />;
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <AuthProvider
      onAuthError={(error) => {
        console.error('[Web HS] Authentication error:', error);
      }}
      onSessionExpired={() => {
        console.log('[Web HS] Session expired');
      }}
    >
      <QueryClientProvider client={queryClient}>
        <InnerApp />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
);
