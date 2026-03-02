# WS19 — VISUAL DIRECTOR + SOUND DIRECTOR
**Lead: Art & Audio Direction**
**Studio: Deep Brine Studios**

## Your Job

Two parallel workstreams. You are establishing the baseline art style and sound style that ALL future assets must follow. Get this wrong and everything that follows is inconsistent. Get it right and any future agent or contractor can produce assets that feel native to The Molt Pit.

Read first:
- `design/visual/ART-DIRECTION.md` — style references, what we are/aren't
- `design/visual/ICONOGRAPHY.md` — all 53 icon specs
- `design/audio/SOUND-DESIGN.md` — all SFX specs
- `design/world/ONTOLOGY.md` — vocabulary
- `design/README.md` — mandatory PR rules

---

## WORKSTREAM A: VISUAL DIRECTOR

### Your Mission

Establish the visual baseline. Every icon, every UI element, every particle effect must feel like it came from the same place. That place is The Brine — dark, pressurized, bioluminescent, cartoon-violent.

### Step 1: Style Reference Sheet — `design/visual/STYLE-REFERENCE.md`

Write a precise visual spec that an image-generation agent or human illustrator can follow without asking questions. Include:

**Color palette (exact hex values):**
- Background colors per screen (The Brine, The Shed, The Pit, The Tank)
- Rarity colors (Common / Rare / Legendary borders + background tints)
- Action colors (damage = red, heal = green, stun = cyan, etc.)
- The House UI chrome color

**Typography:**
- What fonts are in use (check `web/app/__root.tsx` for current fonts)
- Size hierarchy (h1, h2, body, tooltip, flavor text)
- The House voice is always in ALL CAPS mono for labels, sentence case for flavor

**Icon visual language:**
- Line weight at different sizes
- Color rules (single dominant color per item, matching item hex)
- Shadow/glow rules (Legendary items glow, Common items do not)
- Border rules per rarity

**Cel-shading rules:**
- How outlines work (thickness, color — black or colored?)
- How lighting works (single light source, where is it?)
- How depth is shown (shadow, not gradient)

### Step 2: Generate 5 Baseline Icons

Using image generation (DALL-E via OpenAI API — key is in `web/.env.local` as `OPENAI_API_KEY`), generate the first 5 icons as a style test:

1. **MAXINE** (Claws) — industrial orange-red hydraulic piston claws
2. **BLOCK-7** (Carapace) — military-green segmented plates, yellow stencil
3. **THE RED GENE** (Tomalley) — red pulsing vein/double helix
4. **SCUTTLE** (action) — sideways-moving crustacean legs
5. **slot-carapace** (UI slot) — stylized shell/armor plate

**Generation prompt template:**
```
Game item icon, cel-shaded cartoon style, thick black outline, [item description],
single dominant color [hex], transparent background, 512x512, 
High on Life / Borderlands visual style, bioluminescent deep sea aesthetic,
bold readable silhouette, no text
```

Save generated images to `web/public/icons/test/` with filename matching item ID.

### Step 3: Style Consistency Check

After generating 5 icons:
- Do they look like they came from the same game?
- Are outlines consistent?
- Are they readable at 32×32? (Screenshot at that size to verify)
- Does the color language work against the dark arena background?

If yes: write `design/visual/STYLE-APPROVED.md` confirming the style is locked with example prompts.
If no: adjust the prompt template and regenerate until consistent. Document what changed and why.

---

## WORKSTREAM B: SOUND DIRECTOR

### Your Mission

Generate the complete SFX library using ElevenLabs. Every action, every item trigger, every screen transition needs a sound. This is what makes The Molt Pit feel alive.

### ⚠️ IMPORTANT: API Key Required

**Before generating any audio, you MUST ping the Pitmaster (Aleks) with:**

```
SOUND DIRECTOR READY — need ElevenLabs API key to proceed.
ElevenLabs MCP or REST API will be used to generate all SFX.
Please provide: ELEVENLABS_API_KEY
Ready to generate [N] sound effects on confirmation.
```

**How to ping:** Post this message to Discord channel `#themoltpit` or send via the session that spawned you.

Do not proceed with audio generation until key is confirmed.

### Step 1 (while waiting for key): SFX Production Plan — `design/audio/SFX-PLAN.md`

Write the complete production plan:

**Technology:** ElevenLabs Sound Effects API
- Endpoint: `https://api.elevenlabs.io/v1/sound-generation`
- Method: POST with `{ text: "description", duration_seconds: N, prompt_influence: 0.3 }`
- Output: MP3 files

**File naming convention:**
```
web/public/sfx/
  actions/
    scuttle.mp3        (move)
    pinch.mp3          (melee)
    spit.mp3           (ranged)
    shell-up.mp3       (guard)
    burst.mp3          (dash)
  items/
    carapace/
      block7-equip.mp3
      block7-hit.mp3
      [etc for all 13 carapaces]
    claws/
      maxine-hit.mp3
      maxine-miss.mp3
      [etc for all 14 claws]
    tomalley/
      red-gene-trigger.mp3
      [etc for all 13 tomalley]
  ui/
    scuttle-start.mp3
    ko.mp3
    victory.mp3
    shed.mp3
    molt-rankup.mp3
    roe-earned.mp3
    menu-select.mp3
    menu-hover.mp3
```

**ElevenLabs prompt for each sound** — write the generation prompt for all ~80 sounds.
Use `design/audio/SOUND-DESIGN.md` as the source spec. Translate each description into an ElevenLabs sound generation prompt.

Examples:
- MAXINE hit: `"Heavy industrial hydraulic crushing impact, deep metallic clunk, mechanical piston compression"`
- BUZZ stun: `"Electrical discharge, sharp crackling ZAP, electric shock arc, screen flash energy"`
- The Apologist sorry: `"Muffled quiet spoken apology, slightly embarrassed, soft 'sorry', cartoon voice"`

### Step 2 (after API key): Generate All Sounds

Write a script `scripts/generate-sfx.ts` that:
1. Reads the SFX plan
2. Calls ElevenLabs API for each sound
3. Saves to `web/public/sfx/` with correct naming
4. Logs each generated file + duration + cost estimate

Run it. Verify outputs. Adjust prompts for any that sound wrong.

### Step 3: Integration Note

After generation, note in `design/audio/SFX-INTEGRATION.md` which sounds are generated and ready for wiring into the game client. The actual wiring into `ArenaCanvas.tsx` / UI components is a separate engineering task.

---

## Mandatory PR Rules

When you push:
1. `CHANGELOG.md` (root) — add entry with all assets produced
2. `design/DECISIONS.md` — log art style decisions and sound direction decisions
3. `design/BUDGET.md` — log: number of icons generated × estimated cost per image, number of SFX generated × ElevenLabs cost

## Success

**Visual:** 5 consistent icons exist in `web/public/icons/test/`. A style guide exists that any agent can follow to generate more. Zero ambiguity about what The Molt Pit looks like.

**Sound:** ElevenLabs SFX plan exists with every prompt written. After API key is provided, all ~80 sounds are generated and filed correctly.

The game starts to sound and look like a real game.
