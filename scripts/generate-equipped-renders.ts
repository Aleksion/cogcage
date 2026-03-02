#!/usr/bin/env bun
/**
 * Batch generate all creature × item equipped renders
 * 5 species × 40 items = 200 images
 * Uses gpt-image-1 edit API seeded with approved species reference images
 * Saves to: design/visual/equipped/{species}/{slot}-{item-id}.png
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) throw new Error("OPENAI_API_KEY not set");

const REPO = join(import.meta.dir, "..");
const APPROVED = join(REPO, "design/visual/approved");
const OUT_BASE = join(REPO, "design/visual/equipped");
mkdirSync(OUT_BASE, { recursive: true });

const SPECIES = [
  {
    id: "lobster",
    file: "species-LOBSTER-APPROVED.png",
    desc: "standard upright lobster, orange-red coloring, forward-facing claws, stalked cyan eyes",
    equip_style: "equipment attaches naturally to a bipedal upright crustacean body"
  },
  {
    id: "crab",
    file: "species-CRAB-APPROVED.png",
    desc: "fiddler crab, wide low body, one enormous crusher claw on right side, small pincer on left, scarlet red",
    equip_style: "equipment fits on a wide flat-bodied lateral crab, claws on sides not front"
  },
  {
    id: "mantis",
    file: "species-MANTIS-APPROVED.png",
    desc: "mantis shrimp, elongated body, raptorial strike arms, iridescent teal-violet, rotating compound eyes",
    equip_style: "equipment fits on an elongated mantis-like crustacean with folded strike arms"
  },
  {
    id: "hermit",
    file: "species-HERMIT-APPROVED.png",
    desc: "hermit crab, soft body carrying a salvaged shell on back, small natural claws, peering out cautiously",
    equip_style: "equipment layers onto a hermit crab whose carried shell is already their primary armor"
  },
  {
    id: "shrimp",
    file: "species-SHRIMP-APPROVED.png",
    desc: "shrimp, long curved semi-translucent body, bioluminescent organs visible inside, long antennae, fan tail",
    equip_style: "equipment fits on a long elegant shrimp body, translucent shell shows organs through it"
  },
];

const ITEMS = [
  // Carapace
  { id: "block-7", slot: "carapace", desc: "military-green segmented armor plates with yellow stencil markings bolted over the body", color: "#4CAF50" },
  { id: "the-original", slot: "carapace", desc: "plain unremarkable gray shell armor, simple basic plating", color: "#9E9E9E" },
  { id: "hardcase", slot: "carapace", desc: "massive terracotta stone-like armor slabs, enormous weight", color: "#8D6E63" },
  { id: "silkworm", slot: "carapace", desc: "iridescent translucent membrane over the body, barely visible energy dispersal layer", color: "#E1F5FE" },
  { id: "echo", slot: "carapace", desc: "reactive neural mesh armor with glowing circuit lines across the shell", color: "#00BCD4" },
  { id: "the-molt", slot: "carapace", desc: "soft crystalline forming shell, mid-hardening, delicate growth visible", color: "#B2EBF2" },
  { id: "widow", slot: "carapace", desc: "matte black void armor that absorbs all light, near invisible", color: "#212121" },
  { id: "bleed-back", slot: "carapace", desc: "armor covered in outward-facing metallic spines and razor edges all over the body", color: "#F44336" },
  { id: "the-patriarch", slot: "carapace", desc: "ancient barnacle-crusted cathedral-weight armor with geological age and fossils", color: "#5D4037" },
  { id: "ghost-shell", slot: "carapace", desc: "phasing semi-transparent spectral armor flickering between solid and vapor", color: "#9C27B0" },
  { id: "inverter", slot: "carapace", desc: "biomorphic green-veined armor that converts damage to healing energy", color: "#00C853" },
  { id: "the-sarcophagus", slot: "carapace", desc: "sealed stone vault armor like an ancient burial case wrapped around the body", color: "#607D8B" },
  { id: "paper-mache", slot: "carapace", desc: "comically fragile paper and craft material armor, crumpled and obviously inadequate", color: "#FFF9C4" },
  // Claws
  { id: "maxine", slot: "claws", desc: "massive industrial orange-red hydraulic piston crusher claws with pressure gauges", color: "#FF6B35" },
  { id: "snapper", slot: "claws", desc: "clean surgical precision snap claws, efficient and fast, no bulk", color: "#78909C" },
  { id: "the-reach", slot: "claws", desc: "telescoping segmented claw arms that extend far outward, teal metallic", color: "#26C6DA" },
  { id: "the-flicker", slot: "claws", desc: "spinning rapid-flicker blade claws with motion blur, stacking cuts", color: "#FF7043" },
  { id: "buzz", slot: "claws", desc: "electrostatic crackling claws with visible electrical arc discharge always sparking", color: "#FFEB3B" },
  { id: "needle", slot: "claws", desc: "thin precision needle claws, armor-ignoring surgical penetrators", color: "#E0E0E0" },
  { id: "the-apologist", slot: "claws", desc: "soft padded apologetic claws wrapped in cushioning, reluctant strikers", color: "#F8BBD0" },
  { id: "tenderhook", slot: "claws", desc: "barbed hook claws with ratcheting grip mechanism that locks onto targets", color: "#795548" },
  { id: "venom", slot: "claws", desc: "biological venom delivery claws with visible toxin sacs and injection tubes", color: "#76FF03" },
  { id: "widow-maker", slot: "claws", desc: "coiled charged single-use devastating claw, coiled spring energy, one shot", color: "#D32F2F" },
  { id: "reversal", slot: "claws", desc: "mirror-surface reflective claws that redirect force back at attacker", color: "#B0BEC5" },
  { id: "the-original-appendage", slot: "claws", desc: "ancient primordial claws from before The Pit, heavy with age and power", color: "#BF360C" },
  { id: "cracker", slot: "claws", desc: "wedge-shaped armor-splitting claws designed to pry shells open", color: "#FF8F00" },
  { id: "the-heir", slot: "claws", desc: "modest humble claws that glow faintly, growing stronger with each win", color: "#B39DDB" },
  // Tomalley
  { id: "the-red-gene", slot: "tomalley", desc: "crimson pulsing DNA double helix glowing through the chest, red vein tendrils visible", color: "#FF1744" },
  { id: "standard-issue", slot: "tomalley", desc: "plain gray metabolic organ, basic unremarkable internal glow", color: "#90A4AE" },
  { id: "mulch", slot: "tomalley", desc: "wet green biological regeneration organs, growing tissue tendrils glowing inside", color: "#69F0AE" },
  { id: "oracle", slot: "tomalley", desc: "scanning sensor orb glowing inside the chest, rotating radar lines visible through shell", color: "#40C4FF" },
  { id: "the-ghost-protocol", slot: "tomalley", desc: "spectral phase organ flickering inside, reality becoming uncertain around the creature", color: "#CE93D8" },
  { id: "spite", slot: "tomalley", desc: "dark explosive detonator organ coiled inside, silent death-trigger waiting", color: "#BF360C" },
  { id: "double-down", slot: "tomalley", desc: "mechanical counter organ with four tally marks glowing inside, fifth building", color: "#FF6F00" },
  { id: "the-long-game", slot: "tomalley", desc: "deep resonance organ barely glowing, slow power accumulation visible inside", color: "#4A148C" },
  { id: "survival-instinct", slot: "tomalley", desc: "coiled reflexive dodge organ, pure instinct energy glowing in the nervous system", color: "#00E5FF" },
  { id: "deep-memory", slot: "tomalley", desc: "data analysis brain organ with pattern recognition threads glowing inside", color: "#1565C0" },
  { id: "second-wind", slot: "tomalley", desc: "revival organ that glows emergency gold inside the chest, last-resort breath system", color: "#F9A825" },
  { id: "quantum-hook", slot: "tomalley", desc: "teleportation organ with space-fold coils glowing purple-white inside", color: "#E040FB" },
  { id: "the-house-edge", slot: "tomalley", desc: "gold coin organ with The House's mark, gold glow emanating from inside the body", color: "#FFD600" },
];

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function generateEquipped(species: typeof SPECIES[0], item: typeof ITEMS[0]): Promise<void> {
  const dir = join(OUT_BASE, species.id);
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `${item.slot}-${item.id}.png`);
  
  if (existsSync(outPath)) {
    process.stdout.write(`s`); // skip indicator
    return;
  }

  const speciesImg = readFileSync(join(APPROVED, species.file));
  const equippedRef = readFileSync(join(APPROVED, "crustie-maxine-block7-APPROVED.png"));

  const prompt = `${species.desc} Crustie, equipped with ${item.slot.toUpperCase()} ITEM: ${item.desc}. ${species.equip_style}. Same cel-shaded cartoon art style as reference images — thick black outlines, High on Life / Borderlands style, dark #050510 background. The ${item.slot} item is clearly visible and the dominant color is ${item.color}. Full body front-facing character sheet. The creature's species anatomy is preserved — only the ${item.slot} equipment changes.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", prompt);
      form.append("size", "1024x1024");
      form.append("quality", "medium");
      form.append("n", "1");
      form.append("image[]", new Blob([speciesImg], { type: "image/png" }), "species.png");
      form.append("image[]", new Blob([equippedRef], { type: "image/png" }), "style-ref.png");

      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}` },
        body: form,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HTTP ${res.status}: ${err.slice(0, 150)}`);
      }

      const d = await res.json() as any;
      const b64 = d.data?.[0]?.b64_json;
      if (!b64) throw new Error("No b64_json");

      writeFileSync(outPath, Buffer.from(b64, "base64"));
      process.stdout.write(`✓`);
      return;
    } catch (e: any) {
      if (attempt === 3) {
        process.stdout.write(`✗`);
        console.error(`\nFAIL ${species.id}/${item.slot}-${item.id}: ${e.message}`);
        return;
      }
      await sleep(3000 * attempt);
    }
  }
}

async function main() {
  const total = SPECIES.length * ITEMS.length;
  console.log(`🎨 Generating ${total} equipped renders (${SPECIES.length} species × ${ITEMS.length} items)`);
  console.log(`Output: ${OUT_BASE}\n`);

  let done = 0;
  for (const species of SPECIES) {
    process.stdout.write(`\n[${species.id.toUpperCase()}] `);
    // Run each species in batches of 4 (API rate friendly)
    const BATCH = 4;
    for (let i = 0; i < ITEMS.length; i += BATCH) {
      const batch = ITEMS.slice(i, i + BATCH);
      await Promise.all(batch.map(item => generateEquipped(species, item)));
      done += batch.length;
      await sleep(500);
    }
    process.stdout.write(` (${ITEMS.length} done)`);
  }

  console.log(`\n\n✅ Complete — ${total} equipped renders in ${OUT_BASE}`);
}

main().catch(console.error);
