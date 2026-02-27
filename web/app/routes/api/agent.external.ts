import { createFileRoute } from '@tanstack/react-router'

const TIMEOUT_MS = 4000;
const NO_OP_RESPONSE = { action: { type: 'NO_OP' } };

export const Route = createFileRoute('/api/agent/external')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { webhookUrl?: string; payload?: unknown };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify(NO_OP_RESPONSE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { webhookUrl, payload } = body;

        // Validate webhookUrl is a valid HTTPS URL
        if (!webhookUrl || typeof webhookUrl !== 'string') {
          return new Response(JSON.stringify(NO_OP_RESPONSE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        let url: URL;
        try {
          url = new URL(webhookUrl);
        } catch {
          return new Response(JSON.stringify(NO_OP_RESPONSE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (url.protocol !== 'https:') {
          return new Response(JSON.stringify(NO_OP_RESPONSE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Forward payload to webhook with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const text = await resp.text();
          let result: Record<string, unknown>;
          try {
            result = JSON.parse(text);
          } catch {
            console.error('[agent/external] Non-JSON response from webhook:', text.slice(0, 200));
            return new Response(JSON.stringify(NO_OP_RESPONSE), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Pass through reasoning if present
          const action = result.action ?? result;
          const reasoning = (result as Record<string, unknown>).reasoning ??
            (action as Record<string, unknown>)?.reasoning ?? undefined;

          return new Response(JSON.stringify({ action, reasoning }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          clearTimeout(timeout);
          console.error('[agent/external] Webhook call failed:', (err as Error).message);
          return new Response(JSON.stringify(NO_OP_RESPONSE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
})
