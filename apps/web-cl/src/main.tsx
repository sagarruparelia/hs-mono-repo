import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as ReactDOM from 'react-dom/client';
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';
import { AuthProvider } from '@hs-mono-repo/shared-auth';
import App from './app/app';

const queryClient = getSharedQueryClient();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <AuthProvider
      onAuthError={(error) => {
        console.error('[Web CL] Authentication error:', error);
      }}
      onSessionExpired={() => {
        console.log('[Web CL] Session expired');
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
);
