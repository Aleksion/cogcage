import type { APIRoute } from 'astro';
import { getRooms } from './index.ts';

export const prerender = false;

/** GET /api/rooms/:id — Poll room status */
export const GET: APIRoute = async ({ params }) => {
  const rooms = getRooms();
  const room = rooms.get(params.id || '');

  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    room: {
      id: room.id,
      name: room.name,
      hostName: room.hostName,
      hasPassword: !!room.password,
      players: room.players,
      status: room.status,
      inviteCode: room.inviteCode,
    },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

/** POST /api/rooms/:id — Join room */
export const POST: APIRoute = async ({ params, request }) => {
  const rooms = getRooms();
  const room = rooms.get(params.id || '');

  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: { playerName?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (room.status !== 'waiting') {
    return new Response(JSON.stringify({ error: 'Room already started' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (room.password && body.password !== room.password) {
    return new Response(JSON.stringify({ error: 'Wrong password' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (room.players.length >= 2) {
    return new Response(JSON.stringify({ error: 'Room is full' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const playerName = (body.playerName || 'Challenger').slice(0, 20);
  room.players.push({ name: playerName, ready: false, joinedAt: Date.now() });

  return new Response(JSON.stringify({
    ok: true,
    room: {
      id: room.id,
      name: room.name,
      hostName: room.hostName,
      hasPassword: !!room.password,
      players: room.players,
      status: room.status,
      inviteCode: room.inviteCode,
    },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
