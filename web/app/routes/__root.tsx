/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { convexClient } from '../lib/convex'
import * as React from 'react'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content:
          'Compete in AI-powered skill ladders. Climb ranks, unlock rewards, and join the alpha waitlist.',
      },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', href: '/favicon.ico' },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;500;600;700&family=Kanit:wght@400;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootComponent() {
  return (
    <ConvexAuthProvider client={convexClient}>
      <Outlet />
    </ConvexAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
              }
              * { box-sizing: border-box; }
              html, body {
                margin: 0;
                width: 100%;
                min-height: 100%;
              }
              a { color: inherit; }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
