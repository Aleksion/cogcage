# Crustie Rigging Guide
*Deep Brine Studios — The Molt Pit*

---

## Status

Meshy auto-rig is **web UI only** on the current plan (API requires Meshy Pro ~$120/month). Two options:

**Option A — Manual via Meshy web UI (~10 min total)**
Fast, free, good enough for Sprint 2.

**Option B — Upgrade Meshy to Pro**
Unlocks the rigging API → can automate all 5 in a script. Worth it if we're iterating often.

---

## Option A: Manual Rigging (web UI)

For each species, takes ~2 minutes:

1. Go to [meshy.ai/workspace](https://www.meshy.ai/workspace)
2. Find the model (filter by "Image to 3D", look for the 5 Crustie tasks)
3. Click **Rig & Animate**
4. Select rig type: **Biped** (these are upright crustaceans — biped skeleton fits)
5. Wait ~30s for auto-rig to complete
6. Add animation clips:
   - **Idle** — search "idle breathing" or "idle sway"
   - **Walk** → maps to SCUTTLE action — search "walk cycle"
   - **Attack melee** → maps to PINCH — search "punch" or "melee attack"
   - **Attack ranged** → maps to SPIT — search "throw" or "ranged attack"
   - **Hit react** — search "hit reaction" or "flinch"
   - **Death** — search "death fall" or "ragdoll death"
7. Export: **GLB with animations embedded**
8. Upload to Vercel Blob:
   ```bash
   vercel blob upload crustie-lobster-rigged.glb --scope precurion
   ```
9. Post new CDN URL to WS19 thread

**Meshy task IDs** (for finding models in the UI):
| Species | Task ID |
|---------|---------|
| Lobster | `019cacaa-f0c0-73a6-9fbe-861ac80f2e0e` |
| Crab    | `019cacab-274a-73b2-a50f-177ca9190abd` |
| Mantis  | `019cacaa-f8b1-73a7-9cd9-d2c3a6dc9a66` |
| Hermit  | `019cacab-30d9-7fb3-b9ba-aa04d5239b35` |
| Shrimp  | `019cacab-0005-74b9-b8af-9dbc54d48072` |

---

## Option B: Meshy Pro API (automated)

Upgrade at meshy.ai → Pro plan. Then run:

```bash
MESHY_KEY=your_pro_key bun run scripts/rig-and-animate.ts
```

Script is at `scripts/rig-and-animate.ts` (authored, ready to run once Pro is active).

Cost estimate: 5 credits/rig × 5 species = 25 rig credits + 3 credits/anim × 6 clips × 5 species = 90 anim credits = ~115 credits total (~$2 at Pro rates).

---

## Babylon.js Animation Setup

Once rigged GLBs are exported, loading animations in Babylon:

```typescript
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";

const result = await SceneLoader.ImportMeshAsync(
  "",
  "https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/",
  "crustie-lobster-rigged.glb",
  scene
);

const animGroups = result.animationGroups;
const idle   = animGroups.find(g => g.name.toLowerCase().includes("idle"));
const walk   = animGroups.find(g => g.name.toLowerCase().includes("walk"));
const attack = animGroups.find(g => g.name.toLowerCase().includes("attack"));
const hit    = animGroups.find(g => g.name.toLowerCase().includes("hit"));
const death  = animGroups.find(g => g.name.toLowerCase().includes("death"));

// Play idle on load
idle?.start(true); // true = loop

// On SCUTTLE action:
walk?.start(false); // false = don't loop, plays once

// On PINCH:
attack?.start(false);
```

---

## Animation → Action Mapping

| Animation Clip | Game Action | Trigger |
|----------------|-------------|---------|
| idle           | Standing between turns | Default state |
| walk           | SCUTTLE | On Scuttle action |
| attack_melee   | PINCH | On Pinch action |
| attack_ranged  | SPIT | On Spit action |
| hit            | Taking damage | On HP reduction |
| death          | KO | On HP = 0 |

---

*Authored: Visual Director, WS19 | March 2, 2026*
