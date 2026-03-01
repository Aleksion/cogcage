import GitHub from "@auth/core/providers/github";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";

// Anonymous/guest auth is dev-only. Never set ENABLE_GUEST_AUTH=true in production.
// To enable locally: add ENABLE_GUEST_AUTH=true to your Convex dev deployment env vars.
const providers = [
  GitHub,
  Resend,
  ...(process.env.ENABLE_GUEST_AUTH === "true" ? [Anonymous] : []),
];

export const { auth, signIn, signOut, store } = convexAuth({
  providers,
});
