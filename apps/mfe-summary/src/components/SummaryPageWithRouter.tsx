/**
 * Summary Page with Memory Router
 *
 * Framework-agnostic routed version of SummaryPage.
 * Uses TanStack Router with memory history for isolated routing.
 *
 * Features:
 * - Independent routing (no browser history)
 * - Initial route via props
 * - Route change events
 * - Works in any framework context
 */

import { useEffect, useRef } from 'react';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';
import { routeTree } from '../routeTree.gen';

export interface SummaryPageWithRouterProps {
  // User identification (new format)
  userIdType?: string; // e.g., 'EID', 'HSID', 'OHID', 'MSID'
  userIdValue?: string; // The actual ID value
  loggedInUserIdType?: string; // Type of logged-in user ID
  loggedInUserIdValue?: string; // Logged-in user ID value

  // Legacy support
  userId?: string;

  // UI and routing
  theme?: 'light' | 'dark';
  route?: string; // Initial route path (e.g., '/', '/details', '/analytics')

  // Callbacks
  onRouteChange?: (route: string) => void; // Callback when route changes
  onDataLoad?: (data: any) => void;
}

// Create memory history outside component to avoid recreation
const createMFERouter = (initialRoute: string = '/') => {
  const memoryHistory = createMemoryHistory({
    initialEntries: [initialRoute],
  });

  return createRouter({
    routeTree,
    history: memoryHistory,
    context: {
      userId: undefined,
      theme: undefined,
      onDataLoad: undefined,
    },
  });
};

export function SummaryPageWithRouter({
  userIdType = 'EID',
  userIdValue,
  loggedInUserIdType,
  loggedInUserIdValue,
  userId, // Legacy support
  theme = 'light',
  route = '/',
  onRouteChange,
  onDataLoad,
}: SummaryPageWithRouterProps) {
  // Use new format if available, otherwise fall back to legacy
  const effectiveUserId = userIdValue || userId || 'demo-user';
  const queryClient = getSharedQueryClient();

  // Create router with initial route
  const routerRef = useRef(createMFERouter(route));
  const router = routerRef.current;

  // Update context when props change
  useEffect(() => {
    router.update({
      context: {
        userId: effectiveUserId,
        userIdType,
        userIdValue,
        loggedInUserIdType,
        loggedInUserIdValue,
        theme,
        onDataLoad,
      },
    });
  }, [router, effectiveUserId, userIdType, userIdValue, loggedInUserIdType, loggedInUserIdValue, theme, onDataLoad]);

  // Navigate to new route when route prop changes
  useEffect(() => {
    if (route && router.state.location.pathname !== route) {
      router.navigate({ to: route as any });
    }
  }, [route, router]);

  // Emit route change events
  useEffect(() => {
    const unsubscribe = router.subscribe('onRouterUpdate', () => {
      const currentPath = router.state.location.pathname;
      onRouteChange?.(currentPath);
    });

    return () => unsubscribe();
  }, [router, onRouteChange]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default SummaryPageWithRouter;
