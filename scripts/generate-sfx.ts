#!/usr/bin/env bun
/**
 * The Molt Pit — SFX Generation Script
 * Uses ElevenLabs Sound Effects API to generate all ~82 game sounds
 * Run: ELEVENLABS_API_KEY=sk_... bun run scripts/generate-sfx.ts
 */

import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) throw new Error("ELEVENLABS_API_KEY not set");

const OUT_DIR = join(import.meta.dir, "../web/public/sfx");
const ENDPOINT = "https://api.elevenlabs.io/v1/sound-generation";

interface SFX {
  file: string;
  duration: number;
  prompt: string;
  promptInfluence?: number;
}

const SOUNDS: SFX[] = [
  // ── UI / Global ──────────────────────────────────────────────────────────
  { file: "ui/enter-pit.mp3", duration: 2.0, prompt: "Deep underwater pressure drop, bioluminescent ambient chime, descending into abyss, distant low frequency hum with crystalline ping" },
  { file: "ui/scuttle-start.mp3", duration: 1.5, prompt: "Arena crowd rising to distant roar, underwater stadium lights powering up, electrical hum building, combat bell" },
  { file: "ui/ko.mp3", duration: 1.5, prompt: "Sudden silence beat, then distant deep underwater bell toll, reverberating metallic resonance, finality" },
  { file: "ui/victory.mp3", duration: 2.0, prompt: "Low bass swell building, single triumphant brass note, underwater victory fanfare, deep resonant power chord" },
  { file: "ui/shed.mp3", duration: 1.5, prompt: "Shell crumbling and cracking apart, exoskeleton breaking into pieces, low pitch drop, defeated crumbling" },
  { file: "ui/molt-rankup.mp3", duration: 2.0, prompt: "Shell cracking open from inside, emergence sound, new harder shell forming, ascending crystalline tones, power-up transformation" },
  { file: "ui/roe-earned.mp3", duration: 0.5, prompt: "Wet bubble pop, organic egg deposit, slimy satisfying pop sound, underwater currency collection" },
  { file: "ui/menu-select.mp3", duration: 0.3, prompt: "Short crisp underwater click, bioluminescent UI confirmation, clean digital ping with wet quality" },
  { file: "ui/menu-hover.mp3", duration: 0.2, prompt: "Subtle underwater hover tick, faint bioluminescent pulse, soft wet UI feedback" },

  // ── Actions ───────────────────────────────────────────────────────────────
  { file: "actions/scuttle.mp3", duration: 0.8, prompt: "Hydraulic mechanical leg stepping sound, robotic crustacean walking, pressurized joint movement, wet metallic click-step" },
  { file: "actions/pinch.mp3", duration: 0.5, prompt: "Heavy mechanical claw snapping shut, hydraulic pincer closing, metallic crushing impact, deep clamp sound" },
  { file: "actions/spit.mp3", duration: 0.6, prompt: "Wet biological projectile launch, pressurized liquid shot, slimy splattering projectile arc, slightly comical" },
  { file: "actions/shell-up.mp3", duration: 0.7, prompt: "Heavy armor plates closing and locking, mechanical shell sealing shut, multiple metal segments clicking into defensive position" },
  { file: "actions/burst.mp3", duration: 0.5, prompt: "Hydraulic pressure jet release, sharp compressed water burst, high-pressure propulsion blast, crustacean jet movement" },

  // ── Carapace Items ────────────────────────────────────────────────────────
  { file: "items/carapace/block7-equip.mp3", duration: 0.8, prompt: "Heavy military-grade hydraulic armor locking into place, deep mechanical clunk, industrial exoskeleton mounting, pressurized seal" },
  { file: "items/carapace/block7-hit.mp3", duration: 0.5, prompt: "Deep heavy armor impact thud, military-grade plating absorbing blow, final and solid, no resonance just mass" },
  { file: "items/carapace/the-original-equip.mp3", duration: 0.5, prompt: "Quiet unremarkable click, simple shell attachment, nothing special, plain locking mechanism" },
  { file: "items/carapace/the-original-hit.mp3", duration: 0.4, prompt: "Unremarkable thud, basic impact on plain shell, dull hit sound, nothing dramatic" },
  { file: "items/carapace/hardcase-equip.mp3", duration: 1.0, prompt: "Heavy stone blocks grinding together, massive weight settling, terracotta armor plates stacking with grinding pressure" },
  { file: "items/carapace/hardcase-hit.mp3", duration: 0.5, prompt: "Extremely heavy impact on stone-like armor, deep bass thud, immovable object hit, structural weight" },
  { file: "items/carapace/hardcase-no-burst.mp3", duration: 0.4, prompt: "Failed mechanical action, dry click of locked mechanism, unable to fire, pressurized system refusing to engage" },
  { file: "items/carapace/silkworm-equip.mp3", duration: 0.6, prompt: "Ethereal whisper shimmer, translucent membrane unfolding, iridescent light fabric rustling, barely audible" },
  { file: "items/carapace/silkworm-hit.mp3", duration: 0.4, prompt: "Hissing scatter sound, energy dispersing through membrane, hit fragmenting and dissipating, light shimmer impact" },
  { file: "items/carapace/echo-equip.mp3", duration: 0.5, prompt: "Electronic mesh activating, neural network click-response, reactive circuit powering on" },
  { file: "items/carapace/echo-hit.mp3", duration: 0.4, prompt: "Spring-loaded mechanical release, reactive snap response, counter-mechanism triggering from impact" },
  { file: "items/carapace/echo-counter.mp3", duration: 0.3, prompt: "Sharp electronic snap, rapid counter-attack trigger, reactive neural burst firing, quick aggressive response" },
  { file: "items/carapace/the-molt-equip.mp3", duration: 0.6, prompt: "Soft crystalline shell forming, delicate biological growth sound, fragile new shell hardening" },
  { file: "items/carapace/the-molt-hit.mp3", duration: 0.4, prompt: "Normal impact on semi-hard shell, moderate thud with slight crystalline quality" },
  { file: "items/carapace/the-molt-harden.mp3", duration: 0.5, prompt: "Brief crystalline hardening chime, shell calcifying, mineral formation tinkle, getting harder" },
  { file: "items/carapace/widow-equip.mp3", duration: 0.3, prompt: "Near silence, faint presence, matte black void absorbing sound, barely perceptible engagement" },
  { file: "items/carapace/widow-hit.mp3", duration: 0.4, prompt: "Normal impact on dark surface, unremarkable hit, no special quality" },
  { file: "items/carapace/widow-save.mp3", duration: 0.8, prompt: "Single low underwater bell tone, death-defying moment, solemn survival chime, one chance used" },
  { file: "items/carapace/bleed-back-equip.mp3", duration: 0.6, prompt: "Metallic spines extending outward, sharp spike clatter, aggressive armor deploying with razor sounds" },
  { file: "items/carapace/bleed-back-hit.mp3", duration: 0.5, prompt: "Impact with ricochet damage, hit that bounces back, metallic spike deflection, incoming force redirected" },
  { file: "items/carapace/the-patriarch-equip.mp3", duration: 1.0, prompt: "Ancient stone grinding, cathedral-weight armor mounting, barnacle-crusted plates shifting with deep age, geological" },
  { file: "items/carapace/the-patriarch-hit.mp3", duration: 0.6, prompt: "Cathedral echo impact, ancient resonance, hit reverberating through stone corridors, deep aged resonance" },
  { file: "items/carapace/ghost-shell-equip.mp3", duration: 0.8, prompt: "Eerie phase hum beginning, constant spectral vibration, invisible shell engaging, unsettling frequency" },
  { file: "items/carapace/ghost-shell-hit.mp3", duration: 0.4, prompt: "Phase static interference, hit passing through semi-transparent barrier, reality glitch impact" },
  { file: "items/carapace/ghost-shell-dodge.mp3", duration: 0.3, prompt: "Brief static burst, reality skip, phase-shift dodge, millisecond disappearance and return" },
  { file: "items/carapace/inverter-hit.mp3", duration: 0.4, prompt: "Normal impact above 50% health, standard hit sound, nothing unusual" },
  { file: "items/carapace/inverter-heal.mp3", duration: 0.5, prompt: "Wet healing sound from damage, impact transforming into regeneration, damage becoming health, reversed biology" },
  { file: "items/carapace/the-sarcophagus-hit.mp3", duration: 0.5, prompt: "Sealed vault absorbing impact, contained clang behind stone walls, muffled protected hit, seal holding" },
  { file: "items/carapace/the-sarcophagus-break.mp3", duration: 1.0, prompt: "Stone shattering catastrophically, ancient seals breaking, vault cracking open, protective casing destroyed, exposed" },
  { file: "items/carapace/paper-mache-equip.mp3", duration: 0.4, prompt: "Soft paper rustling, fragile material settling, craft paper crinkling, obviously inadequate armor" },
  { file: "items/carapace/paper-mache-hit.mp3", duration: 0.4, prompt: "Alarming crumple, paper crushing under impact, disturbingly fragile destruction, cardboard caving in" },

  // ── Claw Items ────────────────────────────────────────────────────────────
  { file: "items/claws/maxine-hit.mp3", duration: 0.6, prompt: "Massive industrial hydraulic crushing impact, deep metallic clunk, mechanical piston compression, devastating single blow" },
  { file: "items/claws/maxine-miss.mp3", duration: 0.5, prompt: "Mournful hydraulic whoosh, heavy machinery missing target, sad pressurized swing through empty air" },
  { file: "items/claws/maxine-charge.mp3", duration: 0.8, prompt: "Hydraulic pressure building, mechanical whine charging up, piston compression winding, building to strike" },
  { file: "items/claws/snapper-hit.mp3", duration: 0.3, prompt: "Clean precise snap, efficient claw closing, no-nonsense mechanical clip, reliable and fast" },
  { file: "items/claws/the-reach-hit.mp3", duration: 0.4, prompt: "Hollow distant-quality impact, strike from far away, telescoping arm connecting, extended reach hit" },
  { file: "items/claws/the-reach-extend.mp3", duration: 0.5, prompt: "Telescoping mechanical arm extending, segments sliding out, teal metallic extension, increasing reach" },
  { file: "items/claws/the-flicker-hit.mp3", duration: 0.3, prompt: "Rapid metallic flickering with wet click, spinning blade making contact, fast laceration, stacking damage" },
  { file: "items/claws/buzz-hit.mp3", duration: 0.4, prompt: "Sharp electrical crackling impact, electrostatic discharge on contact, zapping pincer strike" },
  { file: "items/claws/buzz-stun.mp3", duration: 0.6, prompt: "Full electrical discharge ZAP, sharp crackling arc, electric shock overload, screen-flash energy burst, stunning" },
  { file: "items/claws/buzz-idle.mp3", duration: 1.0, prompt: "Constant low electrical buzz hum, persistent static charge, looping ambient electrical current, eager energy" },
  { file: "items/claws/needle-hit.mp3", duration: 0.3, prompt: "Thin high-pitched precision pierce, no impact thud just entry, surgical needle penetration, armor-ignoring" },
  { file: "items/claws/the-apologist-hit.mp3", duration: 0.4, prompt: "Soft uncomfortable impact, reluctant hit, muffled strike that seems to apologize for itself" },
  { file: "items/claws/the-apologist-sorry.mp3", duration: 0.5, prompt: "Muffled quiet spoken cartoon voice whispering sorry, slightly embarrassed soft apology, 0.2 seconds after hit" },
  { file: "items/claws/tenderhook-grab.mp3", duration: 0.5, prompt: "Wet mechanical clamp locking onto target, hook engaging and holding, ratcheting grip tightening, trapped" },
  { file: "items/claws/tenderhook-release.mp3", duration: 0.3, prompt: "Spring-loaded snap release, hook disengaging suddenly, mechanical spring letting go, freed" },
  { file: "items/claws/venom-hit.mp3", duration: 0.4, prompt: "Wet biological injection, venom delivery through tube, syringe-like penetration, toxin entering" },
  { file: "items/claws/venom-tick.mp3", duration: 0.3, prompt: "Ticking drip of poison, periodic venom damage, liquid toxin drop, subtle persistent damage" },
  { file: "items/claws/widow-maker-hit.mp3", duration: 0.8, prompt: "Catastrophic devastating crack, charge whine building to explosive single-use strike, maximum force impact, destruction" },
  { file: "items/claws/widow-maker-break.mp3", duration: 0.6, prompt: "Weapon shattering after use, claw breaking apart, quiet sad mechanical breaking sound, spent and done" },
  { file: "items/claws/reversal-return.mp3", duration: 0.5, prompt: "Reversed whoosh, energy returning to attacker, sound playing backwards, reflected force" },
  { file: "items/claws/the-original-appendage-hit.mp3", duration: 0.5, prompt: "Deep resonant boom from another era, ancient powerful strike, primordial claw impact, echoing through ages" },
  { file: "items/claws/the-original-appendage-equip.mp3", duration: 0.8, prompt: "Ancient creaking on equip, old joints reluctantly moving, primordial appendage awakening, centuries of disuse" },
  { file: "items/claws/cracker-hit.mp3", duration: 0.4, prompt: "Satisfying crack-and-grind, armor-breaking wedge prying, shell cracking open, structural compromise" },
  { file: "items/claws/the-heir-hit.mp3", duration: 0.3, prompt: "Quiet clean hum on impact, modest strike that remembers, faint resonance growing with each win" },
  { file: "items/claws/the-heir-grow.mp3", duration: 0.5, prompt: "Ascending tone of growing power, weapon learning and strengthening, faint hum becoming louder, inheritance" },

  // ── Tomalley Items ────────────────────────────────────────────────────────
  { file: "items/tomalley/the-red-gene-trigger.mp3", duration: 0.8, prompt: "Rapid aggressive drumbeat kicking in, adrenaline surge, heartbeat accelerating to combat tempo, below 40 percent emergency" },
  { file: "items/tomalley/the-red-gene-heartbeat.mp3", duration: 1.0, prompt: "Steady biological heartbeat pulse, organic rhythmic thump, living tissue pulsing, background vital sign, looping" },
  { file: "items/tomalley/standard-issue-pulse.mp3", duration: 0.5, prompt: "Soft metabolic pulse, gentle biological rhythm, unremarkable organ functioning, periodic gentle hum" },
  { file: "items/tomalley/mulch-regen.mp3", duration: 0.6, prompt: "Wet biological regeneration, living tissue growing, squishy organic healing, cellular repair sounds, slightly gross" },
  { file: "items/tomalley/oracle-sweep.mp3", duration: 0.8, prompt: "Electronic sensor sweep, predictive scanning beam, radar-like analysis pulse, calculating and reading patterns" },
  { file: "items/tomalley/the-ghost-protocol-phase.mp3", duration: 0.5, prompt: "Shimmer in and out of phase, reality flickering, existence becoming uncertain, spectral transition" },
  { file: "items/tomalley/spite-explode.mp3", duration: 1.0, prompt: "Silence for half a second then sudden violent explosion, delayed detonation, death-triggered blast, final revenge" },
  { file: "items/tomalley/double-down-tick.mp3", duration: 0.3, prompt: "Ascending counting tone, tally mark sound, building toward fifth beat, mechanical counter incrementing" },
  { file: "items/tomalley/double-down-fifth.mp3", duration: 0.5, prompt: "Heavy powerful fifth beat, payoff impact, charged-up strike landing, accumulated power releasing" },
  { file: "items/tomalley/the-long-game-deepen.mp3", duration: 1.0, prompt: "Imperceptible deepening tone, gradually increasing low frequency, slow power accumulation, barely noticeable strengthening" },
  { file: "items/tomalley/survival-instinct-dodge.mp3", duration: 0.4, prompt: "Rushing air auto-dodge, instinctive evasion, no warning just sudden movement, reflexive escape" },
  { file: "items/tomalley/deep-memory-chime.mp3", duration: 0.5, prompt: "Recognition chime at pattern detection, data analysis completing, understanding achieved, insight bell" },
  { file: "items/tomalley/deep-memory-click.mp3", duration: 0.2, prompt: "Faint analytical click, pattern read attempt, subtle data collection, quiet observation" },
  { file: "items/tomalley/second-wind-revive.mp3", duration: 1.2, prompt: "Death sound beginning then dramatically reversing, breath returning, reversal of shutdown, revival gasp, back from the edge" },
  { file: "items/tomalley/quantum-hook-teleport.mp3", duration: 0.8, prompt: "Complete silence for 0.3 seconds then sudden arrival from nowhere, space-fold displacement, quantum appearance" },
  { file: "items/tomalley/the-house-edge-coin.mp3", duration: 0.5, prompt: "Gold coin payment sound, currency exchanging hands, faint satisfied sound from The House, profitable transaction" },
];

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function generate(sfx: SFX, retries = 3): Promise<{ success: boolean; size?: number; error?: string }> {
  const outPath = join(OUT_DIR, sfx.file);
  const dir = outPath.substring(0, outPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sfx.prompt,
          duration_seconds: sfx.duration,
          prompt_influence: sfx.promptInfluence ?? 0.3,
        }),
      });

      if (res.status === 429) {
        const wait = attempt * 3000;
        console.warn(`  Rate limited, waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const buf = await res.arrayBuffer();
      writeFileSync(outPath, Buffer.from(buf));
      return { success: true, size: buf.byteLength };
    } catch (e: any) {
      if (attempt === retries) return { success: false, error: e.message };
      await sleep(1000 * attempt);
    }
  }
  return { success: false, error: "Max retries exceeded" };
}

async function main() {
  console.log(`🎵 Generating ${SOUNDS.length} sounds for The Molt Pit...\n`);

  let passed = 0, failed = 0, totalBytes = 0;
  const failures: string[] = [];

  for (const sfx of SOUNDS) {
    process.stdout.write(`  ${sfx.file.padEnd(55)}`);
    const result = await generate(sfx);
    if (result.success) {
      const kb = ((result.size ?? 0) / 1024).toFixed(1);
      console.log(`✅ ${kb}KB`);
      passed++;
      totalBytes += result.size ?? 0;
    } else {
      console.log(`❌ ${result.error}`);
      failed++;
      failures.push(sfx.file);
    }
    // Small delay between requests to be polite
    await sleep(200);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ ${passed} generated  ❌ ${failed} failed  📦 ${(totalBytes / 1024).toFixed(0)}KB total`);
  if (failures.length) {
    console.log(`\nFailed:\n${failures.map(f => `  - ${f}`).join("\n")}`);
  }
}

main().catch(console.error);
