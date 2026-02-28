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

if (!url || !token) {
  throw new Error(
    'Missing Upstash Redis credentials. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment.',
  );
}

export const redis = new Redis({ url, token });
