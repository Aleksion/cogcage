# Task: Wire PlayCanvas 3D scene into QuickDemo

## Context
The Molt Pit — AI agent battle game. TanStack Start app in `web/`.
Run `cd web && bun install` first.

## The Problem
`QuickDemo.tsx` shows a text feed + HP bars. The 3D PlayCanvas arena already exists in
`PlayCanvasScene.ts` and is wired into `Play.tsx`. Need to wire it into QuickDemo too.

## What to Copy From Play.tsx (lines ~432–520, ~561)

### 1. Add refs (after existing useState lines)
```tsx
const playCanvasRef = useRef<HTMLCanvasElement>(null);
const sceneRef = useRef<any>(null);
const [pcActive, setPcActive] = useState(false);
```

### 2. Add VFX word overlay state
```tsx
interface VfxWord { id: string; text: string; color: string }
const [vfxWords, setVfxWords] = useState<VfxWord[]>([]);
```

### 3. PlayCanvas lifecycle effect
Copy the effect from Play.tsx (~line 491). Key changes vs Play.tsx:
- Trigger on `phase === 'playing'` (QuickDemo uses 'playing'/'ended', not 'match')
- The init/destroy pattern is identical

```tsx
useEffect(() => {
  if (phase !== 'playing' || !playCanvasRef.current) return;
  let destroyed = false;
  import('../lib/ws2/PlayCanvasScene').then(({ PlayCanvasScene }) => {
    if (destroyed || !playCanvasRef.current) return;
    try {
      const scene = new PlayCanvasScene(playCanvasRef.current);
      sceneRef.current = scene;
      setPcActive(true);
    } catch (e) {
      console.warn('[PlayCanvas] Init failed:', e);
      setPcActive(false);
    }
  }).catch((e) => {
    console.warn('[PlayCanvas] Load failed:', e);
    setPcActive(false);
  });
  return () => {
    destroyed = true;
    sceneRef.current?.destroy?.();
    sceneRef.current = null;
    setPcActive(false);
  };
}, [phase]);
```

### 4. VFX canvas event listener
Copy from Play.tsx (~line 476):
```tsx
useEffect(() => {
  const canvas = playCanvasRef.current;
  if (!canvas) return;
  const handler = (e: Event) => {
    const { text, color } = (e as CustomEvent).detail;
    const id = `vfx_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    setVfxWords(prev => [...prev, { id, text, color }]);
    setTimeout(() => setVfxWords(prev => prev.filter(v => v.id !== id)), 800);
  };
  canvas.addEventListener('moltpit:vfx', handler);
  return () => canvas.removeEventListener('moltpit:vfx', handler);
}, []);
```

### 5. Update the snapshot callback
In the existing snapshot handler (where setBotAHp/setBotBHp are called), add ONE line at the top:
```tsx
sceneRef.current?.update?.(snap);
```

### 6. Add canvas to JSX
Find the section in JSX that shows the arena/map and REPLACE the CSS grid or empty div with:
```tsx
{/* PlayCanvas 3D arena */}
<div style={{ position: 'relative', height: 360, marginBottom: '1rem', borderRadius: 14, overflow: 'hidden', background: '#101010', border: '3px solid #111' }}>
  <canvas
    ref={playCanvasRef}
    style={{ width: '100%', height: '100%', display: 'block' }}
  />
  {/* VFX word overlay */}
  {vfxWords.map(v => (
    <div key={v.id} style={{
      position: 'absolute', top: '40%', left: '50%',
      transform: 'translate(-50%,-50%)',
      fontFamily: 'Bangers, display', fontSize: '3rem',
      color: v.color, textShadow: `3px 3px 0 #000`,
      pointerEvents: 'none', animation: 'vfx-bolt-in 0.6s ease-out forwards',
    }}>{v.text}</div>
  ))}
  {/* Fallback — show before PlayCanvas loads */}
  {!pcActive && (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>
      Loading arena...
    </div>
  )}
</div>
```

Add the VFX keyframe animation to the `<style>` tag already in QuickDemo:
```css
@keyframes vfx-bolt-in { 0% { transform: translate(-50%,-50%) scale(0.3); opacity: 0; } 25% { transform: translate(-50%,-50%) scale(1.3); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 0; } }
```

## What NOT to change
- All the HP bars, action feed with reasoning, BYO key input, winner banner, rematch button
- The bot configs (BERSERKER/TACTICIAN)
- The match runner logic (`runMatchAsync`)
- Any other files

## Success Criteria
1. `/play` shows the PlayCanvas 3D arena with bots moving around
2. HP bars + reasoning feed still visible alongside/below the arena
3. `cd web && bun run build` passes clean
4. Commit: `feat: wire PlayCanvas 3D scene into QuickDemo`
5. Push to `feat/quickdemo-3d`
6. `gh pr create --title "feat: wire PlayCanvas 3D scene into QuickDemo" --body "QuickDemo now uses the existing PlayCanvasScene — bots move in 3D arena with VFX. HP bars and reasoning feed kept alongside." --base main`
7. `openclaw system event --text "Done: PlayCanvas 3D wired into QuickDemo — PR open" --mode now`
