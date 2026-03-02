import React, { useEffect, useRef, useCallback } from 'react';
import type { MatchSnapshot } from '../game/PitScene';

/**
 * BabylonArena — React wrapper for the Babylon.js PitScene.
 *
 * Renders The Pit: dark atmospheric 3D isometric grid arena driven by
 * WebSocket snapshots from the Cloudflare Durable Object.
 *
 * Usage:
 *   <BabylonArena
 *     snapshot={latestSnapshot}
 *     botNames={{ bot1: 'MAXINE', bot2: 'VENOM' }}
 *   />
 */

interface BabylonArenaProps {
  snapshot: MatchSnapshot | null;
  botNames?: Record<string, string>;
  onMatchEnd?: (winnerId: string | null) => void;
  /** Which actor is "ours" (for future camera focus / highlight) */
  playerBotId?: string;
  /** Override canvas style (e.g. fullscreen) */
  canvasStyle?: React.CSSProperties;
}

export function BabylonArena({ snapshot, botNames, onMatchEnd, playerBotId, canvasStyle }: BabylonArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<import('../game/PitScene').PitScene | null>(null);
  const destroyedRef = useRef(false);

  // Initialize Babylon.js scene
  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return;
    destroyedRef.current = false;

    let mounted = true;

    (async () => {
      // Dynamic import to avoid SSR issues (Babylon requires window/document)
      const { PitScene } = await import('../game/PitScene');
      if (!mounted || destroyedRef.current || !canvasRef.current) return;

      const scene = new PitScene(canvasRef.current);
      sceneRef.current = scene;

      if (botNames) {
        scene.setBotNames(botNames);
      }
    })();

    return () => {
      mounted = false;
      destroyedRef.current = true;
      if (sceneRef.current) {
        sceneRef.current.dispose();
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

  // Forward snapshots to the Babylon scene
  useEffect(() => {
    if (sceneRef.current && snapshot) {
      sceneRef.current.applySnapshot(snapshot);

      // Check for match end
      if (snapshot.state.ended && onMatchEnd) {
        onMatchEnd(snapshot.state.winnerId);
      }
    }
  }, [snapshot, onMatchEnd]);

  return (
    <canvas
      ref={canvasRef}
      id="babylon-arena"
      width={900}
      height={640}
      style={{
        width: 900,
        height: 640,
        background: '#050510',
        borderRadius: 8,
        overflow: 'hidden',
        border: '2px solid rgba(0, 229, 255, 0.15)',
        boxShadow: '0 0 40px rgba(0, 229, 255, 0.05), inset 0 0 60px rgba(0, 0, 0, 0.5)',
        display: 'block',
        ...canvasStyle,
      }}
    />
  );
}

/**
 * Hook: useWebSocketArena
 *
 * Connects to the Cloudflare DO WebSocket, receives tick messages,
 * and transforms them into MatchSnapshot objects for BabylonArena.
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
