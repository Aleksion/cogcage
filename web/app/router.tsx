import { createRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { QueryClient } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { convexClient } from './lib/convex'
import { routeTree } from './routeTree.gen'

const convexQueryClient = new ConvexQueryClient(convexClient)

export function getRouter() {
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
    }),
    queryClient,
  )
  return router
}
