import { createFileRoute } from '@tanstack/react-router'

/**
 * In-memory room store. Rooms are ephemeral (no DB needed for demo).
 * In production this would use Redis or a DB.
 */
export interface Room {
  id: string;
  name: string;
  password: string | null;
  hostName: string;
  createdAt: number;
  players: { name: string; ready: boolean; joinedAt: number }[];
  status: 'waiting' | 'started' | 'finished';
  inviteCode: string;
}

// Global in-memory store (shared across API routes via module scope)
const rooms = new Map<string, Room>();

// Clean up rooms older than 30 minutes
function cleanStaleRooms() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.createdAt < cutoff) rooms.delete(id);
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getRooms(): Map<string, Room> {
  cleanStaleRooms();
  return rooms;
}

export const Route = createFileRoute('/api/rooms')({
  server: {
    handlers: {
      /** POST /api/rooms — Create a new room */
      POST: async ({ request }) => {
        cleanStaleRooms();

        let body: { name?: string; hostName?: string; password?: string };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        const name = (body.name || 'Arena Room').slice(0, 40);
        const hostName = (body.hostName || 'Host').slice(0, 20);
        const password = body.password ? String(body.password).slice(0, 32) : null;

        const room: Room = {
          id: generateId(),
          name,
          password,
          hostName,
          createdAt: Date.now(),
          players: [{ name: hostName, ready: false, joinedAt: Date.now() }],
          status: 'waiting',
          inviteCode: generateInviteCode(),
        };

        rooms.set(room.id, room);

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
      },
      /** GET /api/rooms — List open rooms */
      GET: async () => {
        cleanStaleRooms();

        const list = Array.from(rooms.values())
          .filter((r) => r.status === 'waiting')
          .map((r) => ({
            id: r.id,
            name: r.name,
            hostName: r.hostName,
            hasPassword: !!r.password,
            playerCount: r.players.length,
            inviteCode: r.inviteCode,
            createdAt: r.createdAt,
          }))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 20);

        return new Response(JSON.stringify({ ok: true, rooms: list }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  },
})
