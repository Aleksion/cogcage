import React, { useEffect, useRef, useCallback } from 'react';
import type { MatchSnapshot } from '../lib/ws2/MatchScene';

/**
 * PhaserArena — React wrapper for the Phaser 3 MatchScene.
 *
 * Renders The Pit: dark atmospheric 2D grid arena driven by
 * WebSocket snapshots from the Cloudflare Durable Object.
 *
 * Usage:
 *   <PhaserArena
 *     snapshot={latestSnapshot}
 *     botNames={{ bot1: 'MAXINE', bot2: 'VENOM' }}
 *   />
 */

interface PhaserArenaProps {
  snapshot: MatchSnapshot | null;
  botNames?: Record<string, string>;
  onMatchEnd?: (winnerId: string | null) => void;
}

export function PhaserArena({ snapshot, botNames, onMatchEnd }: PhaserArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const destroyedRef = useRef(false);

  // Initialize Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    destroyedRef.current = false;

    // Dynamic import to avoid SSR issues (Phaser requires window/document)
    let mounted = true;

    (async () => {
      const [Phaser, { MatchScene }] = await Promise.all([
        import('phaser'),
        import('../lib/ws2/MatchScene'),
      ]);

      if (!mounted || destroyedRef.current) return;

      const config = MatchScene.getConfig();
      config.parent = containerRef.current!;

      const game = new Phaser.default.Game(config);
      gameRef.current = game;

      // Wait for scene to be ready
      game.events.on('ready', () => {
        const scene = game.scene.getScene('MatchScene') as InstanceType<typeof MatchScene>;
        if (scene) {
          sceneRef.current = scene;

          // Set bot names if provided
          if (botNames) {
            scene.setBotNames(botNames);
          }

          // Listen for match end
          scene.events.on('match-ended', (winnerId: string | null) => {
            onMatchEnd?.(winnerId);
          });
        }
      });
    })();

    return () => {
      mounted = false;
      destroyedRef.current = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update bot names
  useEffect(() => {
    if (sceneRef.current && botNames) {
      sceneRef.current.setBotNames(botNames);
    }
  }, [botNames]);

  // Forward snapshots to the Phaser scene
  useEffect(() => {
    if (sceneRef.current && snapshot) {
      sceneRef.current.applySnapshot(snapshot);
    }
  }, [snapshot]);

  return (
    <div
      ref={containerRef}
      id="phaser-arena"
      style={{
        width: 900,
        height: 640,
        background: '#050510',
        borderRadius: 8,
        overflow: 'hidden',
        border: '2px solid rgba(0, 229, 255, 0.15)',
        boxShadow: '0 0 40px rgba(0, 229, 255, 0.05), inset 0 0 60px rgba(0, 0, 0, 0.5)',
      }}
    />
  );
}

/**
 * Hook: useWebSocketArena
 *
 * Connects to the Cloudflare DO WebSocket, receives tick messages,
 * and transforms them into MatchSnapshot objects for PhaserArena.
 */
export function useWebSocketArena(
  matchId: string | null,
  botId: string | null,
  engineWsUrl: string,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [snapshot, setSnapshot] = React.useState<MatchSnapshot | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [ended, setEnded] = React.useState(false);

  const connect = useCallback(() => {
    if (!matchId || !botId || wsRef.current) return;

    const ws = new WebSocket(`${engineWsUrl}/match/${matchId}?botId=${botId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'tick' && msg.state) {
          setSnapshot({
            state: msg.state,
            decisions: [],
            newEvents: msg.events || [],
          });
        }

        if (msg.type === 'match_complete') {
          setEnded(true);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [matchId, botId, engineWsUrl]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { snapshot, connected, ended, disconnect };
}
