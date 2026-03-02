#!/usr/bin/env bun
/**
 * Batch generate all 40 item icons for The Molt Pit
 * Uses gpt-image-1 via OpenAI images/generations API
 * Skips already-generated icons
 * Run: bun run scripts/generate-item-icons.ts
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) throw new Error("OPENAI_API_KEY not set");

const OUT_DIR = join(import.meta.dir, "../web/public/icons");
mkdirSync(OUT_DIR, { recursive: true });

const BASE_PROMPT = (desc: string, color: string, personality: string) =>
  `Game item icon, cel-shaded cartoon style, thick black outline 4px, ${desc}, single dominant color ${color}, dark background #050510, 1024x1024, High on Life / Borderlands visual style, bioluminescent deep sea aesthetic, bold readable silhouette, no text. ${personality}`;

interface Item {
  id: string;
  slot: "carapace" | "claws" | "tomalley";
  desc: string;
  color: string;
  personality: string;
}

const ITEMS: Item[] = [
  // ── Carapace ──────────────────────────────────────────────────────────────
  { id: "block-7",         slot: "carapace", desc: "military-green segmented armor carapace plates with yellow stencil unit markings, heavy battle damage", color: "#4CAF50", personality: "Heavy, bulletproof, built for wars." },
  { id: "the-original",    slot: "carapace", desc: "plain unremarkable gray shell armor, simple and unadorned, basic protection", color: "#9E9E9E", personality: "Nothing special. That is the point." },
  { id: "hardcase",        slot: "carapace", desc: "massive terracotta stone-like armor plates, enormous weight, carved from substrate bedrock", color: "#8D6E63", personality: "Does not move. Does not need to." },
  { id: "silkworm",        slot: "carapace", desc: "iridescent translucent membrane armor, silk-like energy dispersal shell, barely visible", color: "#E1F5FE", personality: "Hit it and watch the energy scatter." },
  { id: "echo",            slot: "carapace", desc: "reactive neural mesh armor with glowing circuit lines, responds to incoming force", color: "#00BCD4", personality: "It remembers every hit." },
  { id: "the-molt",        slot: "carapace", desc: "soft crystalline forming shell, mid-hardening process, delicate and growing", color: "#B2EBF2", personality: "Fragile now. Give it a second." },
  { id: "widow",           slot: "carapace", desc: "matte black void armor, absorbs all light, almost invisible against dark background", color: "#212121", personality: "You won't see it coming either." },
  { id: "bleed-back",      slot: "carapace", desc: "armor covered in outward-facing metallic spines and razor edges, retribution plating", color: "#F44336", personality: "Everything that hits it regrets it." },
  { id: "the-patriarch",   slot: "carapace", desc: "ancient cathedral-weight armor covered in barnacles and deep-sea fossils, geological age", color: "#5D4037", personality: "Older than The House. Still standing." },
  { id: "ghost-shell",     slot: "carapace", desc: "phasing semi-transparent spectral armor, flickering between solid and vapor", color: "#9C27B0", personality: "Sometimes there. Sometimes not." },
  { id: "inverter",        slot: "carapace", desc: "biomorphic healing armor with green pulsing veins, converts damage to life", color: "#00C853", personality: "The math goes backwards." },
  { id: "the-sarcophagus", slot: "carapace", desc: "sealed stone vault armor, ancient burial case design, ominous sealed seams", color: "#607D8B", personality: "What's inside is not for you to know." },
  { id: "paper-mache",     slot: "carapace", desc: "obviously fragile paper and craft material armor, comically inadequate, crumpled edges", color: "#FFF9C4", personality: "Confidence is a form of armor too." },

  // ── Claws ─────────────────────────────────────────────────────────────────
  { id: "maxine",                 slot: "claws", desc: "massive industrial orange-red hydraulic piston crusher claws with pressure gauges and rivets", color: "#FF6B35", personality: "Built to crush. Does not miss a chance." },
  { id: "snapper",                slot: "claws", desc: "clean efficient precision snap claws, surgical and fast, no unnecessary bulk", color: "#78909C", personality: "No drama. Just results." },
  { id: "the-reach",              slot: "claws", desc: "telescoping segmented claw arm that extends outward, teal metallic segments extending", color: "#26C6DA", personality: "Distance is just a setting." },
  { id: "the-flicker",            slot: "claws", desc: "spinning blade claw with rapid flicker motion lines, stacks rapid small cuts", color: "#FF7043", personality: "The cuts add up before you notice." },
  { id: "buzz",                   slot: "claws", desc: "electrostatic crackling claw with visible electrical arc discharge, always sparking", color: "#FFEB3B", personality: "Eager. It wants to fire." },
  { id: "needle",                 slot: "claws", desc: "thin precision needle claw, ignores armor completely, surgical penetration", color: "#E0E0E0", personality: "Armor is a suggestion." },
  { id: "the-apologist",          slot: "claws", desc: "soft padded claw with apologetic posture, reluctant striker, wrapped in cushioning", color: "#F8BBD0", personality: "It is sorry. It hits anyway." },
  { id: "tenderhook",             slot: "claws", desc: "barbed hook claw with ratcheting grip mechanism, locks onto target and holds", color: "#795548", personality: "Once it grabs you, that is the conversation." },
  { id: "venom",                  slot: "claws", desc: "biological venom delivery claw with visible toxin sacs and injection tube tip", color: "#76FF03", personality: "The damage arrives late. Like a letter." },
  { id: "widow-maker",            slot: "claws", desc: "charged single-use devastating claw, coiled spring energy visible, one catastrophic strike then breaks", color: "#D32F2F", personality: "One shot. Make it count." },
  { id: "reversal",               slot: "claws", desc: "mirror-surface reflective claw that redirects force back at attacker", color: "#B0BEC5", personality: "Your own strength is the problem." },
  { id: "the-original-appendage", slot: "claws", desc: "ancient primordial claw from another era, heavy with age and primordial power", color: "#BF360C", personality: "Before MAXINE. Before all of it." },
  { id: "cracker",                slot: "claws", desc: "wedge-shaped armor-splitting claw designed to pry shells open, cracking tool", color: "#FF8F00", personality: "Shells are problems to be solved." },
  { id: "the-heir",               slot: "claws", desc: "modest humble claw that glows faintly and grows stronger with each victory", color: "#B39DDB", personality: "It remembers every win. It learns." },

  // ── Tomalley ──────────────────────────────────────────────────────────────
  { id: "the-red-gene",        slot: "tomalley", desc: "crimson pulsing DNA double helix with glowing red vein tendrils, living biological power", color: "#FF1744", personality: "Alive. Angry. Below 40% it wakes up." },
  { id: "standard-issue",      slot: "tomalley", desc: "plain gray regulatory organ, unremarkable function, basic metabolic pulse", color: "#90A4AE", personality: "Keeps the lights on. Nothing more." },
  { id: "mulch",               slot: "tomalley", desc: "wet green biological regeneration organ, growing tissue tendrils, cellular repair system", color: "#69F0AE", personality: "Squishy. Alive. Healing constantly." },
  { id: "oracle",              slot: "tomalley", desc: "scanning sensor orb with rotating radar sweep lines, predictive pattern analysis", color: "#40C4FF", personality: "It has already seen what you are going to do." },
  { id: "the-ghost-protocol",  slot: "tomalley", desc: "spectral phase organ, flickering between dimensions, reality becoming uncertain", color: "#CE93D8", personality: "Is it there? Depends on the tick." },
  { id: "spite",               slot: "tomalley", desc: "dark explosive detonator organ, coiled death-trigger, silent waiting charge", color: "#BF360C", personality: "You win. But not for free." },
  { id: "double-down",         slot: "tomalley", desc: "tally counter organ with four marks and one payoff, mechanical counting mechanism", color: "#FF6F00", personality: "Four normal. One very not normal." },
  { id: "the-long-game",       slot: "tomalley", desc: "slowly deepening resonance organ, barely visible power accumulation, patience made physical", color: "#4A148C", personality: "Does nothing obvious. Until it does everything." },
  { id: "survival-instinct",   slot: "tomalley", desc: "reflexive dodge organ, coiled spring nervous system, pure instinct no thought required", color: "#00E5FF", personality: "The body knows before the mind does." },
  { id: "deep-memory",         slot: "tomalley", desc: "data analysis brain organ with pattern recognition threads, reads and learns from combat", color: "#1565C0", personality: "Learning. Every tick." },
  { id: "second-wind",         slot: "tomalley", desc: "revival organ that reverses death at the last moment, emergency breath system", color: "#F9A825", personality: "Not today." },
  { id: "quantum-hook",        slot: "tomalley", desc: "teleportation organ with space-fold displacement technology, quantum entanglement coils", color: "#E040FB", personality: "Location is a setting, not a fact." },
  { id: "the-house-edge",      slot: "tomalley", desc: "gold coin currency organ, The House's mark inside the creature, profitable transaction", color: "#FFD600", personality: "The House always gets its cut." },
];

async function generateIcon(item: Item): Promise<void> {
  const outPath = join(OUT_DIR, `${item.slot}-${item.id}.png`);
  if (existsSync(outPath)) {
    console.log(`  SKIP ${item.slot}/${item.id} (exists)`);
    return;
  }

  const prompt = BASE_PROMPT(item.desc, item.color, item.personality);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
        body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", quality: "medium", n: 1 }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
      }

      const d = await res.json() as any;
      const b64 = d.data?.[0]?.b64_json;
      if (!b64) throw new Error("No b64_json in response");

      const buf = Buffer.from(b64, "base64");
      writeFileSync(outPath, buf);
      console.log(`  ✅ ${item.slot}/${item.id} (${(buf.length / 1024).toFixed(0)}KB)`);
      return;
    } catch (e: any) {
      if (attempt === 3) {
        console.log(`  ❌ ${item.slot}/${item.id}: ${e.message}`);
        return;
      }
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main() {
  console.log(`🎨 Generating ${ITEMS.length} item icons for The Molt Pit...\n`);
  
  // Run in batches of 5 (API rate limit friendly)
  const BATCH = 5;
  for (let i = 0; i < ITEMS.length; i += BATCH) {
    const batch = ITEMS.slice(i, i + BATCH);
    await Promise.all(batch.map(generateIcon));
    if (i + BATCH < ITEMS.length) await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ Done. Icons in ${OUT_DIR}`);
}

main().catch(console.error);
