/* ── Skill Definitions ────────────────────────────────────── */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  llmDescription: string;
  inputSchema: object;
  energyCost: number;
  cooldownTurns: number;
  usesPerMatch: number;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  category: 'intel' | 'combat' | 'utility' | 'control';
}

export const SKILL_POOL: SkillDefinition[] = [
  {
    id: 'scan_enemy',
    name: 'Enemy Scan',
    description: 'Reveals the enemy\'s intended action this turn before you decide.',
    llmDescription: 'Scan the enemy to reveal their planned action for this turn. Returns their intended action type.',
    inputSchema: {},
    energyCost: 8,
    cooldownTurns: 2,
    usesPerMatch: -1,
    icon: '\u{1F50D}',
    rarity: 'rare',
    category: 'intel',
  },
  {
    id: 'threat_model',
    name: 'Threat Model',
    description: 'Full tactical analysis: threat level, recommended response, predicted enemy next 2 turns.',
    llmDescription: 'Run a threat model on the current game state. Returns threat level (low/medium/high/critical), recommended_action, and predicted_enemy_moves for next 2 turns.',
    inputSchema: {},
    energyCost: 12,
    cooldownTurns: 3,
    usesPerMatch: -1,
    icon: '\u{1F9E0}',
    rarity: 'legendary',
    category: 'intel',
  },
  {
    id: 'predict_attack',
    name: 'Attack Prediction',
    description: 'Estimates probability the enemy will attack this turn (0-100%).',
    llmDescription: 'Predict whether the enemy will attack this turn. Returns attack_probability (0-100), confidence (low/medium/high).',
    inputSchema: {},
    energyCost: 4,
    cooldownTurns: 1,
    usesPerMatch: -1,
    icon: '\u{1F3AF}',
    rarity: 'common',
    category: 'intel',
  },
  {
    id: 'optimal_position',
    name: 'Optimal Position',
    description: 'Calculates the best cell to move to given your loadout and enemy position.',
    llmDescription: 'Calculate the optimal position to move to this turn. Returns target_position {x, y}, reasoning, and expected_advantage.',
    inputSchema: {},
    energyCost: 5,
    cooldownTurns: 1,
    usesPerMatch: -1,
    icon: '\u{1F4CD}',
    rarity: 'common',
    category: 'intel',
  },
  {
    id: 'heal',
    name: 'Combat Stim',
    description: 'Inject combat stimulants. Restores 20 HP. Once per match.',
    llmDescription: 'Use a combat stim to restore 20 HP. Single use per match.',
    inputSchema: {},
    energyCost: 20,
    cooldownTurns: 0,
    usesPerMatch: 1,
    icon: '\u{1F489}',
    rarity: 'rare',
    category: 'utility',
  },
  {
    id: 'emp_burst',
    name: 'EMP Burst',
    description: 'Drain 30 energy from the enemy. Disrupts their next action.',
    llmDescription: 'Fire an EMP burst at the enemy, draining 30 of their energy.',
    inputSchema: {},
    energyCost: 25,
    cooldownTurns: 4,
    usesPerMatch: -1,
    icon: '\u{26A1}',
    rarity: 'rare',
    category: 'combat',
  },
  {
    id: 'smoke_screen',
    name: 'Smoke Screen',
    description: 'Deploy smoke. Enemy accuracy -30% for 2 turns.',
    llmDescription: 'Deploy a smoke screen. Reduces enemy hit chance by 30% for the next 2 turns.',
    inputSchema: {},
    energyCost: 15,
    cooldownTurns: 5,
    usesPerMatch: -1,
    icon: '\u{1F4A8}',
    rarity: 'common',
    category: 'utility',
  },
  {
    id: 'overclock',
    name: 'Overclock',
    description: 'Overclock your systems. +30% energy regen for 3 turns, then crash (0 regen 1 turn).',
    llmDescription: 'Overclock your energy systems for 3 turns (+30% regen), followed by a 1-turn crash (0 regen).',
    inputSchema: {},
    energyCost: 0,
    cooldownTurns: 8,
    usesPerMatch: -1,
    icon: '\u{2699}\u{FE0F}',
    rarity: 'legendary',
    category: 'utility',
  },
  {
    id: 'hack_action',
    name: 'Action Hack',
    description: 'Attempt to override the enemy\'s next action. 60% success rate.',
    llmDescription: 'Attempt to hack the enemy\'s next action. On success (60% chance), their next action is replaced with GUARD. Returns success: boolean.',
    inputSchema: {},
    energyCost: 30,
    cooldownTurns: 6,
    usesPerMatch: -1,
    icon: '\u{1F4BB}',
    rarity: 'legendary',
    category: 'control',
  },
  {
    id: 'battle_cry',
    name: 'Battle Cry',
    description: '+25% damage on all attacks for 3 turns.',
    llmDescription: 'Unleash a battle cry, boosting your damage by 25% for the next 3 turns.',
    inputSchema: {},
    energyCost: 18,
    cooldownTurns: 5,
    usesPerMatch: -1,
    icon: '\u{1F525}',
    rarity: 'rare',
    category: 'combat',
  },
];

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILL_POOL.find(s => s.id === id);
}

/** Build Anthropic-style tool definitions for equipped skills */
export function skillsToTools(skillIds: string[]): Array<{
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: object; required: string[] };
}> {
  return skillIds
    .map(id => getSkill(id))
    .filter(Boolean)
    .map(skill => ({
      name: skill!.id,
      description: skill!.llmDescription,
      input_schema: {
        type: 'object' as const,
        properties: skill!.inputSchema as Record<string, unknown>,
        required: [],
      },
    }));
}
