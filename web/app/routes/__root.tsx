/// <reference types="vite/client" />
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createRootRoute({
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
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                color-scheme: dark;
                font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                background: #05050a;
              }
              * { box-sizing: border-box; }
              html, body {
                margin: 0;
                width: 100%;
                min-height: 100%;
                background: radial-gradient(circle at 20% 10%, #15152d 0%, #05050a 55%, #030306 100%);
                color: #f6f7ff;
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
