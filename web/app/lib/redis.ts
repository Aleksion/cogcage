import { Redis } from '@upstash/redis';

// In Vercel serverless functions, import.meta.env is NOT populated for secret vars
// (Vite strips non-PUBLIC_ vars at build time for security).
// process.env IS available at runtime in the serverless Node context.
// Fallback to import.meta.env for local Astro dev server compatibility.
const url =
  (typeof process !== 'undefined' && process.env.UPSTASH_REDIS_REST_URL) ||
  import.meta.env.UPSTASH_REDIS_REST_URL;

const token =
  (typeof process !== 'undefined' && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  import.meta.env.UPSTASH_REDIS_REST_TOKEN;

// Lazy init — don't throw at module load time so Preview deployments
// (which may lack Redis creds) don't crash on every SSR request.
// Callers that need Redis (FFA sessions) will get null and should handle gracefully.
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  if (!url || !token) {
    throw new Error(
      'Missing Upstash Redis credentials. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment.',
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

// Proxy that defers credential check until first use
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as any)[prop];
  },
});
