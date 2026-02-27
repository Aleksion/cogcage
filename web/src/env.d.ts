/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** WebSocket base URL for the MatchEngine Durable Object (e.g. wss://themoltpit-engine.aleks-precurion.workers.dev) */
  readonly PUBLIC_ENGINE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    playerId: string;
    /** Auth.js session — populated by middleware on protected routes. */
    session?: {
      user: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      };
      expires: string;
    };
  }
}
