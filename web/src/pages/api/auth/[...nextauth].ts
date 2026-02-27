import type { APIRoute } from 'astro';
import { Auth } from '@auth/core';
import { authConfig } from '../../../lib/auth';

export const prerender = false;

const handler: APIRoute = async ({ request }) => {
  return Auth(request, authConfig);
};

export const GET = handler;
export const POST = handler;
