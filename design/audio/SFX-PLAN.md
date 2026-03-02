# SFX PRODUCTION PLAN — The Molt Pit
**Sound Director: Deep Brine Studios**
**Status: Plan complete. Generation pending ElevenLabs API key.**
**Date: 2026-03-01**

---

## Technology

**API:** ElevenLabs Sound Effects API
**Endpoint:** `https://api.elevenlabs.io/v1/sound-generation`
**Method:** POST
**Payload:**
```json
{
  "text": "<ElevenLabs prompt>",
  "duration_seconds": <N>,
  "prompt_influence": 0.3
}
```
**Output:** MP3 (streamed or buffered)
**Auth header:** `xi-api-key: <ELEVENLABS_API_KEY>`

---

## File Structure

```
web/public/sfx/
  global/
    enter-pit.mp3
    scuttle-start.mp3
    ko.mp3
    victory.mp3
    shed.mp3
    molt-rankup.mp3
    roe-earned.mp3
    menu-select.mp3
    menu-hover.mp3
  actions/
    scuttle.mp3
    pinch.mp3
    spit.mp3
    shell-up.mp3
    burst.mp3
  items/
    carapace/
      block7-equip.mp3
      block7-hit.mp3
      original-equip.mp3
      original-hit.mp3
      hardcase-equip.mp3
      hardcase-hit.mp3
      hardcase-burst-silent.mp3
      silkworm-equip.mp3
      silkworm-hit.mp3
      echo-equip.mp3
      echo-hit.mp3
      echo-counter.mp3
      molt-equip.mp3
      molt-hit.mp3
      molt-harden.mp3
      widow-equip.mp3
      widow-hit.mp3
      widow-save.mp3
      bleedback-equip.mp3
      bleedback-hit.mp3
      patriarch-equip.mp3
      patriarch-hit.mp3
      ghostshell-equip.mp3
      ghostshell-hit.mp3
      ghostshell-dodge.mp3
      inverter-equip.mp3
      inverter-hit-below50.mp3
      sarcophagus-equip.mp3
      sarcophagus-hit.mp3
      sarcophagus-shatter.mp3
      papermache-equip.mp3
      papermache-hit.mp3
    claws/
      maxine-hit.mp3
      maxine-miss.mp3
      maxine-charge.mp3
      snapper-hit.mp3
      reach-hit.mp3
      flicker-hit.mp3
      buzz-hit.mp3
      buzz-ambient.mp3
      buzz-stun.mp3
      needle-hit.mp3
      apologist-hit.mp3
      apologist-sorry.mp3
      tenderhook-hit.mp3
      tenderhook-release.mp3
      venom-hit.mp3
      venom-tick.mp3
      widowmaker-hit.mp3
      widowmaker-charge.mp3
      reversal-hit.mp3
      original-appendage-hit.mp3
      original-appendage-equip.mp3
      cracker-hit.mp3
      heir-hit.mp3
      heir-ambient.mp3
    tomalley/
      redgene-trigger.mp3
      redgene-heartbeat.mp3
      standardissue-pulse.mp3
      mulch-regen.mp3
      oracle-sweep.mp3
      ghostprotocol-trigger.mp3
      spite-death.mp3
      spite-explosion.mp3
      doubledown-ascend.mp3
      doubledown-beat.mp3
      longgame-deepen.mp3
      survivalinstinct-dodge.mp3
      deepmemory-chime.mp3
      deepmemory-click.mp3
      secondwind-death.mp3
      secondwind-revival.mp3
      quantumhook-silence.mp3
      quantumhook-arrival.mp3
      houseedge-coin.mp3
      houseedge-satisfied.mp3
```

**Total sound files: ~82**

---

## ElevenLabs Prompts

### Duration Guide
- UI feedback (hover, click): 0.3–0.5s
- Combat hits, impacts: 0.5–1.0s
- Ambient loops: 2.0–4.0s
- Dramatic moments (KO, Victory, molt): 1.5–3.0s

---

## GLOBAL SFX

| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `enter-pit.mp3` | 2.5s | `Deep underwater pressure drop, low resonant hum building slowly, then a single bioluminescent chime like a crystal bell, deep ocean ambience, anticipatory` |
| `scuttle-start.mp3` | 1.5s | `Arena fills with ambient sound, distant crowd noise underwater, lights flickering on in sequence, electrical hum building, battle beginning fanfare` |
| `ko.mp3` | 2.0s | `Complete silence for half a second, then a single distant boxing bell, deep and reverberant, echoing in underwater space, final` |
| `victory.mp3` | 2.5s | `Low bass swell rising slowly, single triumphant horn note, deep and resonant, bioluminescent shimmer at the end, victory` |
| `shed.mp3` | 1.5s | `Shell crumbling sound, organic exoskeleton pieces falling, low pitch drop, loss deflation, crustacean shell fragmenting` |
| `molt-rankup.mp3` | 2.0s | `Shell cracking open from inside, emergence sound, new exoskeleton forming, crack and pop of chitin, triumphant biological emergence, rank up` |
| `roe-earned.mp3` | 0.4s | `Wet biological bubble pop, satisfying soft plop, single wet sound, currency earned` |
| `menu-select.mp3` | 0.3s | `Clean mechanical click, satisfying button press, slight metallic ping, UI confirmation` |
| `menu-hover.mp3` | 0.2s | `Soft electronic tick, subtle hover sound, very quiet interface feedback` |

---

## ACTION SFX

| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `scuttle.mp3` | 0.6s | `Hydraulic mechanical leg-step, multiple articulated joints moving in sequence, medium weight crustacean movement, mechanical thump` |
| `pinch.mp3` | 0.5s | `Generic lobster claw closing impact, satisfying mechanical clamp, medium impact` |
| `spit.mp3` | 0.6s | `Ridiculous wet projectile launch, biological liquid being ejected, slightly absurd squelching launch sound, lobster spitting` |
| `shell-up.mp3` | 0.5s | `Defensive shell plates closing, heavy mechanical clunk as armor engages, protective stance` |
| `burst.mp3` | 0.5s | `Sharp hydraulic pressure release, compressed air jet, sudden burst of mechanical force` |

---

## CARAPACE ITEM SFX

### BLOCK-7
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `block7-equip.mp3` | 0.8s | `Deep hydraulic clunk of heavy military armor plates locking into place, mechanical weight settling, satisfying heavy equip sound` |
| `block7-hit.mp3` | 0.7s | `Deep final thud of impact against heavy military plate armor, the sound does not bounce, weight absorbed completely, definitive heavy impact` |

### THE ORIGINAL
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `original-equip.mp3` | 0.4s | `Quiet mechanical click, unremarkable equip sound, plain shell settling, minimal` |
| `original-hit.mp3` | 0.5s | `Unremarkable thud, generic impact sound, plain hit with no personality` |

### HARDCASE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `hardcase-equip.mp3` | 1.0s | `Stone blocks grinding against each other, terracotta armor plates settling, heavy stone grinding equip sound` |
| `hardcase-hit.mp3` | 0.8s | `Heavy stone impact, dense block absorbing hit, very low frequency thud, stone on stone` |
| `hardcase-burst-silent.mp3` | 0.1s | `Complete silence, a gap where sound should be, absence of burst` |

### SILKWORM
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `silkworm-equip.mp3` | 0.6s | `Whisper shimmer of translucent membrane settling, iridescent rustling silk, barely audible equip sound` |
| `silkworm-hit.mp3` | 0.5s | `Hiss as hit scatters off membrane, impact dissipating through silk, soft dispersal sound` |

### ECHO
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `echo-equip.mp3` | 0.5s | `Soft click as mesh armor settles, nodes activating with small pulsing sound` |
| `echo-hit.mp3` | 0.5s | `Spring mechanism tension as counter charges, taut mechanical sound` |
| `echo-counter.mp3` | 0.4s | `Sharp spring snap as counter fires, sudden mechanical release, satisfying snap` |

### THE MOLT
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `molt-equip.mp3` | 0.6s | `Soft crystalline shell settling, pale organic sound, gentle biological placement` |
| `molt-hit.mp3` | 0.5s | `Normal hit on pale shell, moderate impact` |
| `molt-harden.mp3` | 0.5s | `Brief shell hardening chime, crystalline solidification sound, every 20 ticks reinforcement sound` |

### WIDOW
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `widow-equip.mp3` | 0.3s | `Complete near-silence on equip, matte black absorbs sound, barely perceptible settling` |
| `widow-hit.mp3` | 0.5s | `Normal impact sound, matte shell absorbing hit` |
| `widow-save.mp3` | 1.0s | `Single low bell tone, deep resonant bell strike, the saved moment, solemn` |

### BLEED BACK
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `bleedback-equip.mp3` | 0.6s | `Metallic spines extending outward with clicking sounds, red armor plates locking` |
| `bleedback-hit.mp3` | 0.7s | `Impact followed immediately by ricochet sound, hit and sharp redirect, spike retaliation` |

### THE PATRIARCH
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `patriarch-equip.mp3` | 1.2s | `Ancient stone grinding slowly, barnacle-encrusted plates settling, very old heavy armor coming to rest, cathedral weight` |
| `patriarch-hit.mp3` | 0.8s | `Impact with cathedral echo reverb, ancient stone being struck, deep resonant hit sound` |

### GHOST SHELL
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `ghostshell-equip.mp3` | 1.5s | `Eerie phase hum beginning, constant subtle phasing sound, barely-there shimmer, like something that should not exist making a sound` |
| `ghostshell-hit.mp3` | 0.5s | `Phase static burst on impact, electronic interference sound, hit through phase space` |
| `ghostshell-dodge.mp3` | 0.4s | `Brief static burst as dodge phases, phase transition crackle, short and sharp` |

### INVERTER
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `inverter-equip.mp3` | 0.4s | `Neutral equip sound, nothing special until threshold` |
| `inverter-hit-below50.mp3` | 0.6s | `Hit sound that transforms into a wet healing sound, impact then biological regeneration squelch, damage becoming health` |

### THE SARCOPHAGUS
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `sarcophagus-equip.mp3` | 1.0s | `Sealed vault clang, stone sarcophagus lid sealing, very heavy stone closing, ancient containment` |
| `sarcophagus-hit.mp3` | 0.6s | `Sealed vault clang, same sound each of the first three hits, predictable and ominous` |
| `sarcophagus-shatter.mp3` | 1.5s | `Shattering ancient stone, sarcophagus breaking apart, explosive stone fragmentation, massive release` |

### PAPER-MACHÉ
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `papermache-equip.mp3` | 0.5s | `Soft papery rustling as cardboard armor settles, surprisingly fragile equip sound` |
| `papermache-hit.mp3` | 0.6s | `Alarming wet paper crumple, cardboard armor collapsing under impact, the most pathetic hit sound possible, paper being destroyed` |

---

## CLAWS ITEM SFX

### MAXINE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `maxine-hit.mp3` | 0.8s | `Massive industrial hydraulic crushing impact, enormous mechanical piston compression, deep metallic clunk, the heaviest hit possible, industrial machinery` |
| `maxine-miss.mp3` | 0.6s | `Mournful hydraulic whoosh as enormous claws miss, the sad sound of a powerful machine failing to connect, weight without impact` |
| `maxine-charge.mp3` | 1.2s | `Hydraulic pressure building, whining piston charging up, mechanical system pressurizing before release, anticipatory machine sound` |

### SNAPPER
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `snapper-hit.mp3` | 0.5s | `Clean crisp claw snap, balanced and satisfying, precise mechanical snap, no excess sound` |

### THE REACH
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `reach-hit.mp3` | 0.6s | `Hollow distant quality impact, extended arm reaching and hitting, slightly echoed as if from a distance, telescoping extension` |

### THE FLICKER
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `flicker-hit.mp3` | 0.4s | `Rapid metallic flickering sound with wet click at end of each stack, spinning blade array hitting rapidly, machine gun mechanical clicks` |

### BUZZ
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `buzz-hit.mp3` | 0.5s | `Sharp electrical crackle on impact, electric discharge hit, lightning strike contained to small scale` |
| `buzz-ambient.mp3` | 3.0s | `Constant low electrical buzzing hum, electric field ambient loop, subtle crackle throughout, loopable` |
| `buzz-stun.mp3` | 1.2s | `Full electrical discharge ZAP, massive electric shock arc, screen-flash energy sound, stun effect activation, large electrical event` |

### NEEDLE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `needle-hit.mp3` | 0.5s | `Thin high-pitched piercing sound, no impact thud, just precise entry, surgical needle puncture, quiet and clinical` |

### THE APOLOGIST
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `apologist-hit.mp3` | 0.4s | `Uncomfortable soft impact, claws that do not want to hurt, gentle but real hit sound` |
| `apologist-sorry.mp3` | 0.4s | `Muffled quiet spoken apology, slightly embarrassed soft sorry, cartoon character voice, non-negotiable post-hit apology sound` |

### TENDERHOOK
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `tenderhook-hit.mp3` | 0.7s | `Wet clamp locking around target with metallic rattle while held, hooking and securing sound, mechanical grip with organic wet quality` |
| `tenderhook-release.mp3` | 0.4s | `Spring snap as lock releases, tension releasing suddenly, sharp mechanical spring sound` |

### VENOM
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `venom-hit.mp3` | 0.6s | `Wet biological injection sound, liquid being injected into target, organic tube delivery system, slightly gross wet puncture` |
| `venom-tick.mp3` | 0.3s | `Ticking liquid drip sound per DoT tick, poison spreading sound, small wet drip tick` |

### WIDOW-MAKER
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `widowmaker-hit.mp3` | 1.0s | `Catastrophic cracking sound, claw breaking as it delivers maximum damage, spectacular destruction followed by quiet sad break sound, the claw dies too` |
| `widowmaker-charge.mp3` | 1.5s | `Whining charge building toward catastrophic release, tension building in cracked claw, danger signal, pre-catastrophe whine` |

### REVERSAL
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `reversal-hit.mp3` | 0.6s | `Attack sound reversed and sent back, temporal reversal whoosh, sound playing backwards toward attacker, damage reflected` |

### THE ORIGINAL APPENDAGE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `original-appendage-hit.mp3` | 0.9s | `Deep resonant boom from another era, ancient claw striking, primordial impact, prehistoric weight and presence` |
| `original-appendage-equip.mp3` | 1.0s | `Ancient creak of very old chitin, artifact equip sound, something very old being awakened, museum piece coming to life` |

### CRACKER
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `cracker-hit.mp3` | 0.6s | `Satisfying crack and grinding sound, shell being cracked and pried, crab cracker sound effect, mechanical wedge force` |

### THE HEIR
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `heir-hit.mp3` | 0.5s | `Clean precise hit, modern efficient claw impact, controlled and capable` |
| `heir-ambient.mp3` | 3.0s | `Quiet hum that grows subtly with each win, legacy power building, very subtle and musical, loopable ambient` |

---

## TOMALLEY ITEM SFX

### THE RED GENE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `redgene-trigger.mp3` | 0.5s | `Rapid drumbeat kicking in below 40%, percussion suddenly appearing, urgent rhythm activation` |
| `redgene-heartbeat.mp3` | 2.0s | `Low organic heartbeat pulse under normal gameplay, biological rhythm, barely audible heartbeat, loopable` |

### STANDARD ISSUE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `standardissue-pulse.mp3` | 0.3s | `Soft metabolic pulse, quiet biological tick, unremarkable bodily function sound, every 10 ticks` |

### MULCH
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `mulch-regen.mp3` | 0.7s | `Wet biological regeneration sound, living tissue repairing, organic squelch of healing flesh, per regeneration window` |

### ORACLE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `oracle-sweep.mp3` | 1.0s | `Electronic sensor sweep sound, scanning beam activating, radar-like pulse, decision window opening, analytical machine sound` |

### THE GHOST PROTOCOL
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `ghostprotocol-trigger.mp3` | 1.0s | `Phase shimmer in and out, ghostly phase transition sound, becoming temporarily incorporeal, phasing audio` |

### SPITE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `spite-death.mp3` | 0.3s | `Silence at death, 0.3 seconds of absolute nothing, deathly quiet gap` |
| `spite-explosion.mp3` | 1.2s | `Massive explosion 0.5 seconds after death silence, retaliatory detonation, the dead striking back, enormous boom` |

### DOUBLE DOWN
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `doubledown-ascend.mp3` | 0.8s | `Four ascending tones in sequence, each higher than the last, building musical anticipation, tally counter charging` |
| `doubledown-beat.mp3` | 0.6s | `Heavy satisfying beat on the 5th count, deep bass hit, the accumulated power releasing, big hit sound` |

### THE LONG GAME
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `longgame-deepen.mp3` | 3.0s | `Imperceptible deepening tone over the course of the fight, very subtle bass increase, patience being rewarded sonically, barely noticeable until it has built, loopable` |

### SURVIVAL INSTINCT
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `survivalinstinct-dodge.mp3` | 0.4s | `Rushing air as auto-dodge fires, sudden air displacement, no warning sound before, just the result, instinct in action` |

### DEEP MEMORY
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `deepmemory-chime.mp3` | 0.6s | `Recognition chime at 30 ticks, the system recognizing a pattern, gentle but precise acknowledgment sound` |
| `deepmemory-click.mp3` | 0.2s | `Faint click as pattern is read, very subtle data acquisition sound, almost imperceptible` |

### SECOND WIND
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `secondwind-death.mp3` | 0.8s | `Death sound begins as normal, the process starting, the expectation of finality` |
| `secondwind-revival.mp3` | 1.0s | `Death sound reversing mid-way, life coming back in reverse, gasp of breath, revival from the brink, the breath of second life` |

### QUANTUM HOOK
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `quantumhook-silence.mp3` | 0.3s | `Complete silence for 0.3 seconds, quantum gap, the space between departure and arrival` |
| `quantumhook-arrival.mp3` | 0.5s | `Arrival after quantum fold, sudden presence sound, the hook landing having skipped space, sharp arrival` |

### THE HOUSE EDGE
| File | Duration | ElevenLabs Prompt |
|------|----------|-------------------|
| `houseedge-coin.mp3` | 0.4s | `Gold coin payment sound, coins transferring, the House taking its cut, satisfying coin transaction` |
| `houseedge-satisfied.mp3` | 0.5s | `Faint satisfied sound from The House, almost amused approval, the house is pleased, subtle character voice` |

---

## Generation Script

See `scripts/generate-sfx.ts` — to be written after API key is confirmed.

The script will:
1. Read this plan (parsed as structured data)
2. Call ElevenLabs for each file
3. Save to correct path in `web/public/sfx/`
4. Log: filename, duration, status, cost estimate
5. Estimated cost: ~82 sounds × $0.002–0.01 per sound = ~$0.16–$0.82 total (estimate only)

---

## Generation Checklist

- [ ] ElevenLabs API key received from Aleks
- [ ] `scripts/generate-sfx.ts` written
- [ ] All 9 global SFX generated
- [ ] All 5 action SFX generated
- [ ] All 32 carapace SFX generated
- [ ] All 25 claws SFX generated
- [ ] All 20 tomalley SFX generated
- [ ] All files verified (playable, correct duration)
- [ ] `design/audio/SFX-INTEGRATION.md` written listing all ready files

---

*Plan written by Sound Director, WS19, 2026-03-01.*
*Generation blocked pending ELEVENLABS_API_KEY confirmation from Aleks.*
