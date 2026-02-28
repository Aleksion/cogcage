import { createRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { QueryClient } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { routeTree } from './routeTree.gen'

const CONVEX_URL =
  (import.meta as any).env.VITE_CONVEX_URL || 'https://intent-horse-742.convex.cloud'

// ConvexQueryClient MUST be created inside getRouter() — not at module level.
// getRouter() is called per-request in SSR; a module-level singleton would throw
// "already subscribed!" on the second request when connect() is called again.
export function getRouter() {
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      scrollRestoration: true,
      context: { queryClient },
      Wrap: ({ children }) => (
        <ConvexAuthProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexAuthProvider>
      ),
    }),
    queryClient,
  )
  return router
}
