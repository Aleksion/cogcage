import GitHub from "@auth/core/providers/github";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";

// Anonymous/guest auth is dev-only. Never set ENABLE_GUEST_AUTH=true in production.
// To enable locally: add ENABLE_GUEST_AUTH=true to your Convex dev deployment env vars.
const providers = [
  GitHub({
    // Pulled from AUTH_GITHUB_ID / AUTH_GITHUB_SECRET when present.
    // Keeping this explicit avoids accidental provider misconfiguration.
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  }),
  Resend({
    // Provider id remains "resend" (used by signIn("resend") in the client).
    apiKey: process.env.AUTH_RESEND_KEY,
    from:
      process.env.AUTH_EMAIL_FROM ??
      "The Molt Pit <onboarding@resend.dev>",
  }),
  ...(process.env.ENABLE_GUEST_AUTH === "true" ? [Anonymous] : []),
];

export const { auth, signIn, signOut, store } = convexAuth({
  providers,
});
