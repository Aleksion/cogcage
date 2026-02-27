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
  }
}
