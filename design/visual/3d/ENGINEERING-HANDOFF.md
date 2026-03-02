# 3D Asset Engineering Handoff
*Deep Brine Studios — The Molt Pit*
*Prepared: March 1, 2026*

---

## What's in this folder

5 GLB files — one per Crustie species:
```
crustie-lobster.glb   (~13MB) — standard archetype
crustie-crab.glb      (~13MB) — fiddler crab, asymmetric claws
crustie-mantis.glb    (~12MB) — mantis shrimp, raptorial arms
crustie-hermit.glb    (~14MB) — hermit crab, carries found shell
crustie-shrimp.glb    (~11MB) — glass cannon, translucent body
```

---

## How to use them (Three.js / React Three Fiber)

These are standard GLB files — drop them straight into Three.js or R3F with a toon material.

### Basic R3F setup with cel-shading

```tsx
import { useGLTF } from '@react-three/drei'
import { MeshToonMaterial } from 'three'

function Crustie({ species = 'lobster' }) {
  const { scene } = useGLTF(`/models/crustie-${species}.glb`)

  // Apply toon material to all meshes
  scene.traverse((child) => {
    if (child.isMesh) {
      child.material = new MeshToonMaterial({
        color: child.material.color,
        map: child.material.map,
      })
    }
  })

  return <primitive object={scene} />
}
```

### Outlines (the Borderlands thick-outline effect)

Use `@react-three/postprocessing` with `Outline` pass, or the `drei` `<Outlines>` component:

```tsx
import { Outlines } from '@react-three/drei'

function Crustie({ species }) {
  const { scene } = useGLTF(`/models/crustie-${species}.glb`)
  return (
    <primitive object={scene}>
      <Outlines thickness={0.03} color="black" />
    </primitive>
  )
}
```

### Recommended post-processing stack

```tsx
import { EffectComposer, ToneMapping } from '@react-three/postprocessing'

// Wrap your canvas content:
<EffectComposer>
  <ToneMapping />
</EffectComposer>
```

---

## File format details

| Property | Value |
|----------|-------|
| Format | GLB (GL Binary, GLTF 2.0) |
| Topology | Quad-dominant mesh |
| Polygon count | ~30,000 triangles per model |
| Textures | PBR (diffuse, roughness, metallic, normal maps — embedded) |
| Rig | None (not rigged yet — see Meshy rigging below) |
| Scale | Meshy default — normalize in engine |

---

## Optimization for game use

These are raw Meshy outputs (~13MB each). For production:

1. **Compress**: Run through `gltf-transform optimize` — expect 60-80% size reduction
   ```bash
   npx @gltf-transform/cli optimize crustie-lobster.glb crustie-lobster.opt.glb
   ```

2. **Reduce poly count**: Target 5,000-10,000 tris for arena use (current 30K is fine for hero shots)
   ```bash
   npx @gltf-transform/cli simplify crustie-lobster.glb --ratio 0.3
   ```

3. **Draco compression**: For web delivery
   ```bash
   npx @gltf-transform/cli optimize --draco crustie-lobster.glb crustie-lobster.draco.glb
   ```

---

## Rigging (for animations)

Meshy has auto-rigging. To get animated versions:
1. Log into meshy.ai → find the task → click "Rig & Animate"
2. Select biped rig (these are upright crustaceans, humanoid-ish skeleton works)
3. Pick from their 500+ animation library: idle, walk, attack, hit, death
4. Export as FBX or GLB with animations embedded

API: `POST /openapi/v1/animations` (requires Meshy Pro plan)

---

## Placing models in `/web/public/models/`

Move GLBs to web-accessible path:
```bash
cp design/visual/3d/crustie-*.glb web/public/models/
```

Then reference via:
```tsx
useGLTF('/models/crustie-lobster.glb')
```

---


## Vercel Blob CDN URLs (live)

```tsx
// Use these directly in useGLTF — globally distributed, no auth
useGLTF("https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-lobster-Z2WN3cFGSSTQO0STQOxXJKG5GQOxXG.glb") // lobster
useGLTF("https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-crab-khUCfgl6zHSHOdiP2cMPeBA38tZRo3.glb") // crab
useGLTF("https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-mantis-N5cksDxSVDlCYxgBVl6YYIeNf2g7a3.glb") // mantis
useGLTF("https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-hermit-YnSbhLPGa5nGN4O4dgNoHb7d36y7f3.glb") // hermit
useGLTF("https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-shrimp-G2WM2yC3gMbh1pWdMpQhmogyyDL52S.glb") // shrimp
```

These are permanent public URLs. No expiry.
## Meshy task IDs (for re-download or re-generation)

| Species | Task ID |
|---------|---------|
| Lobster | `019cacaa-f0c0-73a6-9fbe-861ac80f2e0e` |
| Mantis  | `019cacaa-f8b1-73a7-9cd9-d2c3a6dc9a66` |
| Shrimp  | `019cacab-0005-74b9-b8af-9dbc54d48072` |
| Crab    | `019cacab-274a-73b2-a50f-177ca9190abd` |
| Hermit  | `019cacab-30d9-7fb3-b9ba-aa04d5239b35` |

API key: ask Aleks for `MESHY_API_KEY`
CDN files expire 30 days from generation (March 31, 2026).

---

## The modular equipment approach (recommended for production)

For runtime equipment swapping, don't generate a separate model per loadout. Instead:

1. Keep the 5 base body GLBs
2. Generate each of the 40 items as a **separate GLB** (claws, carapace plates, etc.)
3. In the engine: attach item meshes to the base skeleton's attachment bones
4. Swap items at runtime → infinite permutations, 45 assets instead of 200+

This is how Borderlands 2 handles 87 bazillion guns — modular parts, assembled at runtime.

To get item GLBs: run `scripts/generate-item-icons.ts` variants through Meshy, or model them separately.

---

*Questions → Visual Director (WS19 Discord thread) or Daedalus*
