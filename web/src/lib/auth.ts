import type { AuthConfig } from '@auth/core';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import Resend from '@auth/core/providers/resend';

/** Read env var with process.env primary, import.meta.env fallback (Vercel + local dev). */
function env(key: string): string {
  return (
    (typeof process !== 'undefined' && process.env[key]) ||
    (import.meta as any).env?.[key] ||
    ''
  );
}

export const authConfig: AuthConfig = {
  providers: [
    GitHub({
      clientId: env('GITHUB_ID'),
      clientSecret: env('GITHUB_SECRET'),
    }),
    Google({
      clientId: env('GOOGLE_ID'),
      clientSecret: env('GOOGLE_SECRET'),
    }),
    Resend({
      apiKey: env('AUTH_RESEND_KEY'),
      from: 'noreply@themoltpit.com',
    }),
  ],
  secret: env('AUTH_SECRET'),
  session: { strategy: 'jwt' },
  basePath: '/api/auth',
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.playerId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.playerId) session.user.id = token.playerId as string;
      return session;
    },
  },
  pages: {
    signIn: '/sign-in',
  },
  trustHost: true,
};
