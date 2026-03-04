import type { BotConfig } from './match-types'

/* ── Types ────────────────────────────────────────────────────── */

export type PartSlot = 'shell' | 'claws' | 'directive' | 'trait'

export interface Part {
  id: string
  slot: PartSlot
  name: string          // ALL CAPS, max 20 chars
  lore: string          // 1 sentence, flavor text
  statDelta: {
    hpBonus?: number    // added to base HP (base is 100)
    armorType?: 'light' | 'medium' | 'heavy'
    damageMultiplier?: number  // e.g. 1.3 = +30% dmg
    speedBonus?: number        // future use
  }
  promptFragment: string      // injected verbatim into composed system prompt
  rarity: 'common' | 'rare' | 'legendary'
  color: string               // hex, for card accent
}

/* ── Parts Registry ───────────────────────────────────────────── */

export const PARTS: Part[] = [
  // ── Shells ──
  {
    id: 'exo-plating',
    slot: 'shell',
    name: 'EXO-PLATING',
    lore: '+30 HP · 10% dmg reduction · every 7th SCUTTLE wasted as NO_OP',
    statDelta: { hpBonus: 30, armorType: 'heavy' },
    promptFragment: 'You are heavily armored with 130 HP. You can absorb punishment — prioritize advancing and trading blows. Never retreat; your armor is your advantage.',
    rarity: 'common',
    color: '#4CAF50',
  },
  {
    id: 'phase-silk',
    slot: 'shell',
    name: 'PHASE SILK',
    lore: '25% chance each incoming hit misses entirely · no HP modifier',
    statDelta: { hpBonus: 0, armorType: 'light' },
    promptFragment: 'You have light armor but energy-scattering silk that reduces incoming damage. Stay mobile, flank aggressively, and strike from unexpected angles.',
    rarity: 'rare',
    color: '#9C27B0',
  },
  {
    id: 'reactive-mesh',
    slot: 'shell',
    name: 'REACTIVE MESH',
    lore: '+10 HP · auto-queues counter-attack after each hit if queue is empty',
    statDelta: { hpBonus: 10, armorType: 'medium' },
    promptFragment: 'Your reactive mesh retaliates automatically when struck. After every hit you take, immediately counter-attack. Punish aggression with aggression.',
    rarity: 'rare',
    color: '#FF9800',
  },

  // ── Claws ──
  {
    id: 'crusher-claws',
    slot: 'claws',
    name: 'CRUSHER CLAWS',
    lore: '+40% damage on PINCH · no cooldown · no special conditions',
    statDelta: { damageMultiplier: 1.4 },
    promptFragment: 'Your crushing claws deal massive damage on a direct hit. Prefer MELEE_STRIKE. Patience — wait for close range, then deliver one overwhelming blow.',
    rarity: 'common',
    color: '#F44336',
  },
  {
    id: 'rending-talons',
    slot: 'claws',
    name: 'RENDING TALONS',
    lore: '+10% damage · +1 bleed stack per hit · each stack ticks 2 HP/window (max 8)',
    statDelta: { damageMultiplier: 1.1 },
    promptFragment: 'Your talons stack lacerations with every strike. Prioritize landing repeated hits over single big blows. Move fast, attack often.',
    rarity: 'rare',
    color: '#FF5722',
  },
  {
    id: 'shock-pincers',
    slot: 'claws',
    name: 'SHOCK PINCERS',
    lore: '25% stun chance per hit · stun = opponent forced to NO_OP for 1 window',
    statDelta: { damageMultiplier: 1.0 },
    promptFragment: 'Your shock pincers can paralyze. Use RANGED_SHOT to soften targets first, then close with MELEE_STRIKE when they\'re stunned. Combine range and melee.',
    rarity: 'legendary',
    color: '#00E5FF',
  },

  // ── Directives ──
  {
    id: 'berserker-directive',
    slot: 'directive',
    name: 'BERSERKER',
    lore: 'Attacks every window · always closes distance · never guards',
    statDelta: {},
    promptFragment: 'DIRECTIVE: BERSERKER. Close distance every turn. Attack at every opportunity. Never guard. Never retreat. Pain is just data.',
    rarity: 'common',
    color: '#F44336',
  },
  {
    id: 'tactician-directive',
    slot: 'directive',
    name: 'TACTICIAN',
    lore: 'Guards when energy < 3 · attacks only with range or position advantage',
    statDelta: {},
    promptFragment: 'DIRECTIVE: TACTICIAN. Analyze range before acting. Guard when energy is low. Strike only when you have positional or range advantage.',
    rarity: 'common',
    color: '#2196F3',
  },
  {
    id: 'ambush-directive',
    slot: 'directive',
    name: 'AMBUSH PREDATOR',
    lore: 'Holds at medium range until opponent overextends · then strikes decisively',
    statDelta: {},
    promptFragment: 'DIRECTIVE: AMBUSH. Stay at medium range. Guard and reposition until the enemy is low HP or overextended. Then strike decisively.',
    rarity: 'rare',
    color: '#9C27B0',
  },
  {
    id: 'swarm-directive',
    slot: 'directive',
    name: 'SWARM MIND',
    lore: 'Randomizes SCUTTLE direction each window · attacks from unpredictable angles',
    statDelta: {},
    promptFragment: 'DIRECTIVE: SWARM. Move erratically — never predictable. Attack from multiple angles. Dash frequently. Your unpredictability is your weapon.',
    rarity: 'legendary',
    color: '#FFD600',
  },

  // ── Traits ──
  {
    id: 'adrenaline',
    slot: 'trait',
    name: 'ADRENALINE CORE',
    lore: '−10% damage above 40% HP · +40% damage below 40% HP',
    statDelta: {},
    promptFragment: 'TRAIT: When your HP drops below 40%, ignore your directive — go full BERSERKER. Attack relentlessly. Death means nothing now.',
    rarity: 'common',
    color: '#FF4444',
  },
  {
    id: 'regenerator',
    slot: 'trait',
    name: 'CELL REGEN',
    lore: '+2 HP per decision window · no overheal past HP cap',
    statDelta: {},
    promptFragment: 'TRAIT: You regenerate 3 HP per decision window. Factor this into your strategy — sometimes guarding to regen is the correct choice.',
    rarity: 'rare',
    color: '#00C853',
  },
  {
    id: 'anticipator',
    slot: 'trait',
    name: 'ANTICIPATOR',
    lore: '+15% hit/stun accuracy · state includes predicted opponent next action',
    statDelta: {},
    promptFragment: 'TRAIT: Before each action, reason briefly about what the opponent will do next. Counter their likely action rather than just reacting to past events.',
    rarity: 'legendary',
    color: '#FFD600',
  },
]

/* ── Directive temperature map ────────────────────────────────── */

const DIRECTIVE_TEMPERATURES: Record<string, number> = {
  'berserker-directive': 0.9,
  'tactician-directive': 0.3,
  'ambush-directive': 0.5,
  'swarm-directive': 0.85,
}

/* ── Compose a mold into a BotConfig ──────────────────────────── */

export function composeMold(
  parts: Part[],
  botId: string,
  botName: string,
  position: { x: number; y: number },
  temperature?: number,
  webhookUrl?: string,
): BotConfig {
  const BASE_SYSTEM = `You are ${botName}, a combat crawler in a gladiatorial arena. The arena is a 20x20 grid. Each turn you receive game state and must output ONE action as JSON: {"action":{"type":"MOVE","dir":"N"}} or {"action":{"type":"MELEE_STRIKE","targetId":"botB"}} or {"action":{"type":"RANGED_SHOT","targetId":"botB"}} or {"action":{"type":"GUARD"}} or {"action":{"type":"DASH","dir":"NE"}}. Output ONLY the JSON. No prose.`

  const fragments = (['shell', 'claws', 'directive', 'trait'] as PartSlot[])
    .map(slot => parts.find(p => p.slot === slot)?.promptFragment)
    .filter(Boolean)
    .join('\n')

  const directive = parts.find(p => p.slot === 'directive')
  const shell = parts.find(p => p.slot === 'shell')
  const claws = parts.find(p => p.slot === 'claws')

  const loadout: string[] = ['MOVE', 'GUARD']
  if (claws?.id === 'shock-pincers') loadout.push('RANGED_SHOT')
  loadout.push('MELEE_STRIKE')
  loadout.push('DASH')

  const armorType = shell?.statDelta.armorType ?? 'medium'

  // Use directive-specific temperature if not overridden
  const temp = temperature ?? (directive ? DIRECTIVE_TEMPERATURES[directive.id] ?? 0.7 : 0.7)

  return {
    id: botId,
    name: botName,
    systemPrompt: `${BASE_SYSTEM}\n\n${fragments}`,
    brainPrompt: directive?.promptFragment ?? 'Fight to win.',
    loadout,
    armor: armorType,
    position,
    temperature: temp,
    ...(webhookUrl ? { webhookUrl } : {}),
  }
}

/* ── Random mold picker ───────────────────────────────────────── */

export function randomMold(): Part[] {
  const slots: PartSlot[] = ['shell', 'claws', 'directive', 'trait']
  return slots.map(slot => {
    const options = PARTS.filter(p => p.slot === slot)
    return options[Math.floor(Math.random() * options.length)]
  })
}
