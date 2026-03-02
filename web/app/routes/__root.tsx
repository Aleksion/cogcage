/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { AppNav } from '~/components/AppNav'
import { ClientOnly } from '~/components/ClientOnly'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
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
        href: 'https://fonts.googleapis.com/css2?family=Bangers&family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;500;600;700&family=Kanit:wght@400;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <ClientOnly>{() => <AppNav />}</ClientOnly>
      <Outlet />
    </>
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
                color-scheme: dark;

                --c-yellow: #FFD600;
                --c-orange: #FF9F1C;
                --c-red: #EB4D4B;
                --c-cyan: #00E5FF;
                --c-purple: #7C3AED;
                --c-dark: #1A1A1A;
                --c-black: #000000;

                --arcade-border: 3px solid #000;
                --arcade-shadow: 4px 4px 0 #000;
                --arcade-shadow-lg: 6px 6px 0 #000;

                --f-display: 'Bangers', display;
                --f-body: 'Kanit', sans-serif;
                --f-mono: 'IBM Plex Mono', monospace;
              }
              * { box-sizing: border-box; }
              html, body {
                margin: 0;
                width: 100%;
                min-height: 100%;
                background: #0D0D0D;
                color: #f0f0f5;
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
