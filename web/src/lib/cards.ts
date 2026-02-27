/* ── Card data model & full pool (27 cards) ─────────────────── */

export type CardType = 'weapon' | 'armor' | 'tool';
export type WeaponRange = 'melee' | 'ranged';
export type Rarity = 'common' | 'rare' | 'legendary';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  subtype?: WeaponRange;
  icon: string;
  flavorText: string;
  stats: {
    damage?: number;
    defense?: number;
    weight: number;
    overhead: number;
    energyCost?: number;
    range?: number;
  };
  pros: string[];
  cons: string[];
  rarity: Rarity;
}

/* ── Weapons (10) ──────────────────────────────────────────── */

const WEAPONS: Card[] = [
  {
    id: 'shortsword', name: 'Shortsword', type: 'weapon', subtype: 'melee',
    icon: '🗡️', flavorText: 'Close and personal.',
    stats: { damage: 25, weight: 2, overhead: 0, energyCost: 18, range: 1 },
    pros: ['Fast swing, low energy'], cons: ['Adjacent only, low damage ceiling'],
    rarity: 'common',
  },
  {
    id: 'greatsword', name: 'Greatsword', type: 'weapon', subtype: 'melee',
    icon: '⚔️', flavorText: 'Overkill is underrated.',
    stats: { damage: 45, weight: 5, overhead: 0, energyCost: 28, range: 1 },
    pros: ['High damage, threatens 2 cells'], cons: ['Heavy, slow follow-up'],
    rarity: 'rare',
  },
  {
    id: 'dagger', name: 'Dagger', type: 'weapon', subtype: 'melee',
    icon: '🔪', flavorText: 'Stab first, think later.',
    stats: { damage: 15, weight: 1, overhead: 0, energyCost: 12, range: 1 },
    pros: ['Near-weightless, fast cooldown'], cons: ['Lowest damage in class'],
    rarity: 'common',
  },
  {
    id: 'combat-axe', name: 'Combat Axe', type: 'weapon', subtype: 'melee',
    icon: '🪓', flavorText: 'Armor? What armor.',
    stats: { damage: 35, weight: 4, overhead: 0, energyCost: 22, range: 1 },
    pros: ['Ignores 10% armor'], cons: ['High weight'],
    rarity: 'rare',
  },
  {
    id: 'crossbow', name: 'Crossbow', type: 'weapon', subtype: 'ranged',
    icon: '🏹', flavorText: 'Distance is safety.',
    stats: { damage: 30, weight: 3, overhead: 0, energyCost: 20, range: 3 },
    pros: ['Safe engagement range'], cons: ['Reload turn on heavy use'],
    rarity: 'common',
  },
  {
    id: 'sniper-rifle', name: 'Sniper Rifle', type: 'weapon', subtype: 'ranged',
    icon: '🎯', flavorText: 'They never see it coming.',
    stats: { damage: 50, weight: 4, overhead: 0, energyCost: 35, range: 5 },
    pros: ['Maximum range, massive damage'], cons: ['Cannot fire adjacent'],
    rarity: 'legendary',
  },
  {
    id: 'shotgun', name: 'Shotgun', type: 'weapon', subtype: 'ranged',
    icon: '💥', flavorText: 'Spread the love.',
    stats: { damage: 35, weight: 3, overhead: 0, energyCost: 22, range: 2 },
    pros: ['Spread damage, punishing at close range'], cons: ['Falls off past 2 cells'],
    rarity: 'rare',
  },
  {
    id: 'plasma-cannon', name: 'Plasma Cannon', type: 'weapon', subtype: 'ranged',
    icon: '☄️', flavorText: 'Subtlety is for cowards.',
    stats: { damage: 60, weight: 7, overhead: 0, energyCost: 40, range: 4 },
    pros: ['Highest single-hit damage'], cons: ['Extremely heavy, high energy cost'],
    rarity: 'legendary',
  },
  {
    id: 'chain-whip', name: 'Chain Whip', type: 'weapon', subtype: 'melee',
    icon: '⛓️', flavorText: 'Reach out and touch someone.',
    stats: { damage: 20, weight: 2, overhead: 0, energyCost: 16, range: 2 },
    pros: ['Melee with 2-cell reach'], cons: ['Moderate damage only'],
    rarity: 'common',
  },
  {
    id: 'arc-blade', name: 'Arc Blade', type: 'weapon', subtype: 'melee',
    icon: '⚡', flavorText: 'Everyone gets a turn.',
    stats: { damage: 30, weight: 3, overhead: 0, energyCost: 24, range: 1 },
    pros: ['Hits all adjacent cells'], cons: ['High energy cost for AoE'],
    rarity: 'rare',
  },
];

/* ── Armor (7) ─────────────────────────────────────────────── */

const ARMOR: Card[] = [
  {
    id: 'light-vest', name: 'Light Vest', type: 'armor',
    icon: '🦺', flavorText: 'Better than nothing.',
    stats: { defense: 15, weight: 1, overhead: 0 },
    pros: ['Near-zero weight penalty'], cons: ['Minimal protection'],
    rarity: 'common',
  },
  {
    id: 'chainmail', name: 'Chainmail', type: 'armor',
    icon: '🛡️', flavorText: 'Tested by ten thousand swords.',
    stats: { defense: 25, weight: 3, overhead: 0 },
    pros: ['Solid protection'], cons: ['Moderate weight'],
    rarity: 'common',
  },
  {
    id: 'heavy-plate', name: 'Heavy Plate', type: 'armor',
    icon: '🏰', flavorText: 'A walking fortress.',
    stats: { defense: 40, weight: 6, overhead: 0 },
    pros: ['Maximum damage reduction'], cons: ['Severe movement penalty'],
    rarity: 'rare',
  },
  {
    id: 'reactive-shield', name: 'Reactive Shield', type: 'armor',
    icon: '⚡', flavorText: 'Pain is fuel.',
    stats: { defense: 20, weight: 2, overhead: 0 },
    pros: ['Stored energy: +15% dmg after taking a hit'], cons: ['Only activates on hit'],
    rarity: 'rare',
  },
  {
    id: 'ablative-coating', name: 'Ablative Coating', type: 'armor',
    icon: '💎', flavorText: 'Temporary invincibility is still invincibility.',
    stats: { defense: 30, weight: 2, overhead: 0 },
    pros: ['High protection, degrades per hit (3 charges)'], cons: ['Expires mid-fight'],
    rarity: 'rare',
  },
  {
    id: 'kinetic-absorber', name: 'Kinetic Absorber', type: 'armor',
    icon: '🔋', flavorText: 'Every hit charges the next attack.',
    stats: { defense: 20, weight: 4, overhead: 0 },
    pros: ['Converts 20% of damage taken into energy'], cons: ['Heavy for its protection'],
    rarity: 'rare',
  },
  {
    id: 'cloak-weave', name: 'Cloak Weave', type: 'armor',
    icon: '👻', flavorText: "Can't hit what they can't see.",
    stats: { defense: 10, weight: 1, overhead: 0 },
    pros: ['Reduces enemy hit chance by 20%'], cons: ['Low raw protection'],
    rarity: 'legendary',
  },
];

/* ── Tools (10) ─────────────────────────────────────────────── */

const TOOLS: Card[] = [
  {
    id: 'scanner', name: 'Scanner', type: 'tool',
    icon: '📡', flavorText: 'Know your enemy.',
    stats: { weight: 0, overhead: 1 },
    pros: ['Reveals full enemy loadout in context'], cons: ['+1 LLM context overhead'],
    rarity: 'common',
  },
  {
    id: 'tactical-hud', name: 'Tactical HUD', type: 'tool',
    icon: '🖥️', flavorText: 'Reading the future, one frame ahead.',
    stats: { weight: 0, overhead: 2 },
    pros: ['Predicted enemy move shown in LLM context'], cons: ['+2 overhead'],
    rarity: 'rare',
  },
  {
    id: 'overclock', name: 'Overclock', type: 'tool',
    icon: '⏩', flavorText: 'Red line it.',
    stats: { weight: 0, overhead: 2 },
    pros: ['+30% energy regen for 3 turns'], cons: ['Crashes after (1 turn 0 regen)'],
    rarity: 'rare',
  },
  {
    id: 'medkit', name: 'Medkit', type: 'tool',
    icon: '🩹', flavorText: 'One-time insurance policy.',
    stats: { weight: 1, overhead: 1 },
    pros: ['Restore 25hp once per match'], cons: ['Single use'],
    rarity: 'common',
  },
  {
    id: 'emp-pulse', name: 'EMP Pulse', type: 'tool',
    icon: '🔌', flavorText: 'Lights out.',
    stats: { weight: 1, overhead: 2 },
    pros: ['Drain 30 energy from target'], cons: ['Single use, short range'],
    rarity: 'rare',
  },
  {
    id: 'smoke-screen', name: 'Smoke Screen', type: 'tool',
    icon: '🌫️', flavorText: 'Fog of war, by choice.',
    stats: { weight: 0, overhead: 1 },
    pros: ['Enemy accuracy -30% for 2 turns'], cons: ['Short duration'],
    rarity: 'common',
  },
  {
    id: 'hack-module', name: 'Hack Module', type: 'tool',
    icon: '💻', flavorText: 'Your moves are my moves.',
    stats: { weight: 1, overhead: 3 },
    pros: ['Attempt to override 1 enemy action per match'], cons: ['Heavy context cost'],
    rarity: 'legendary',
  },
  {
    id: 'battle-stim', name: 'Battle Stim', type: 'tool',
    icon: '💉', flavorText: 'Pain as a performance enhancer.',
    stats: { weight: 0, overhead: 2 },
    pros: ['+25% damage for 3 turns'], cons: ['Costs 15hp to activate'],
    rarity: 'rare',
  },
  {
    id: 'repair-drone', name: 'Repair Drone', type: 'tool',
    icon: '🤖', flavorText: 'Heal over time. Stay aggressive.',
    stats: { weight: 2, overhead: 2 },
    pros: ['Passive +5hp regen per turn'], cons: ['Weight + context cost'],
    rarity: 'rare',
  },
  {
    id: 'threat-matrix', name: 'Threat Matrix', type: 'tool',
    icon: '🧠', flavorText: 'Information is the only weapon that never runs out.',
    stats: { weight: 0, overhead: 3 },
    pros: ['Full tactical analysis in LLM context each turn'], cons: ['Heaviest overhead'],
    rarity: 'legendary',
  },
];

/* ── Full pool & index ──────────────────────────────────────── */

export const ALL_CARDS: Card[] = [...WEAPONS, ...ARMOR, ...TOOLS];

const CARD_INDEX = new Map<string, Card>(ALL_CARDS.map((c) => [c.id, c]));

export function getCard(id: string): Card | undefined {
  return CARD_INDEX.get(id);
}

export function getCardsByType(type: CardType): Card[] {
  return ALL_CARDS.filter((c) => c.type === type);
}

/* ── Loadout stat calculations ──────────────────────────────── */

export type ComplexityTier = 'lean' | 'tactical' | 'heavy' | 'overloaded';

export interface LoadoutStats {
  totalWeight: number;
  totalOverhead: number;
  armorValue: number;
  moveCost: number;
  complexityTier: ComplexityTier;
  damageMultiplier: number;
}

export function calculateLoadoutStats(cardIds: string[]): LoadoutStats {
  const cards = cardIds.map(getCard).filter((c): c is Card => !!c);

  const totalWeight = cards.reduce((sum, c) => sum + c.stats.weight, 0);
  const totalOverhead = cards
    .filter((c) => c.type === 'tool')
    .reduce((sum, c) => sum + c.stats.overhead, 0);
  const armorValue = Math.min(
    60,
    cards.filter((c) => c.type === 'armor').reduce((sum, c) => sum + (c.stats.defense ?? 0), 0),
  );

  // moveCost: base 4 energy, +1 per 3 weight
  const moveCost = 4 + Math.floor(totalWeight / 3);

  const complexityTier: ComplexityTier =
    totalOverhead <= 2 ? 'lean' :
    totalOverhead <= 5 ? 'tactical' :
    totalOverhead <= 8 ? 'heavy' : 'overloaded';

  const damageMultiplier = 1.0 - armorValue / 100;

  return { totalWeight, totalOverhead, armorValue, moveCost, complexityTier, damageMultiplier };
}

/* ── Loadout validation ─────────────────────────────────────── */

export const MAX_LOADOUT_SLOTS = 6;
export const MAX_ARMOR_CARDS = 1;
export const MAX_SAVED_LOADOUTS = 10;

export interface LoadoutValidation {
  valid: boolean;
  errors: string[];
}

/* ── Card → match config mapping ──────────────────────────── */

export function loadoutToMatchConfig(cardIds: string[]): {
  actionTypes: string[];
  armor: 'light' | 'medium' | 'heavy';
  moveCost: number;
} {
  const cards = cardIds.map((id) => CARD_INDEX.get(id)).filter((c): c is Card => !!c);
  const actionTypes: string[] = ['MOVE'];
  let armor: 'light' | 'medium' | 'heavy' = 'medium';

  for (const card of cards) {
    if (card.type === 'weapon') {
      if (card.subtype === 'melee') actionTypes.push('MELEE_STRIKE');
      if (card.subtype === 'ranged') actionTypes.push('RANGED_SHOT');
    }
    if (card.type === 'armor') {
      const def = card.stats.defense ?? 0;
      armor = def >= 35 ? 'heavy' : def >= 20 ? 'medium' : 'light';
    }
    if (card.id === 'emp-pulse' || card.id === 'battle-stim' || card.id === 'overclock') {
      actionTypes.push('UTILITY');
    }
    if (card.id === 'hack-module' || card.id === 'threat-matrix') {
      actionTypes.push('UTILITY');
    }
  }

  if (!actionTypes.includes('GUARD')) actionTypes.push('GUARD');
  if (!actionTypes.includes('DASH')) actionTypes.push('DASH');

  const stats = calculateLoadoutStats(cardIds);
  const moveCost = 4 + Math.floor(stats.totalWeight / 3);

  return { actionTypes: [...new Set(actionTypes)], armor, moveCost };
}

export function validateLoadout(cardIds: string[]): LoadoutValidation {
  const errors: string[] = [];

  if (cardIds.length > MAX_LOADOUT_SLOTS) {
    errors.push(`Max ${MAX_LOADOUT_SLOTS} cards allowed`);
  }

  const cards = cardIds.map(getCard);
  const invalid = cardIds.filter((id, i) => !cards[i]);
  if (invalid.length > 0) {
    errors.push(`Unknown card IDs: ${invalid.join(', ')}`);
  }

  const armorCount = cards.filter((c) => c?.type === 'armor').length;
  if (armorCount > MAX_ARMOR_CARDS) {
    errors.push(`Max ${MAX_ARMOR_CARDS} armor card allowed`);
  }

  return { valid: errors.length === 0, errors };
}
