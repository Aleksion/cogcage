const GRID_SIZE = 20;
const UNIT_SCALE = 10;

/**
 * Build a letter key mapping visible actor IDs to letters A, B, C...
 * Returns a record like { "bot-iron-vanguard": "A", "bot-null-protocol": "B" }
 */
export function buildActorKey(
  visibleActorIds: string[],
  _myId: string,
): Record<string, string> {
  const key: Record<string, string> = {};
  for (let i = 0; i < visibleActorIds.length; i++) {
    key[visibleActorIds[i]] = String.fromCharCode(65 + i); // A, B, C...
  }
  return key;
}

/**
 * Build a 20x20 ASCII map of the arena.
 *
 * Y = self, A/B/C... = visible actors, # = obstacle, O = objective center, . = empty
 * Positions are in engine tenths; divide by UNIT_SCALE to get grid coords.
 */
export function buildAsciiMap(
  gameState: { actors: Record<string, { position: { x: number; y: number } }> },
  visibleActorIds: string[],
  myId: string,
  obstacles?: { x1: number; y1: number; x2: number; y2: number }[],
): string {
  // Initialize grid
  const grid: string[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = '.';
    }
  }

  // Place obstacles
  if (obstacles) {
    for (const obs of obstacles) {
      const minCol = Math.max(0, Math.floor(obs.x1 / UNIT_SCALE));
      const maxCol = Math.min(GRID_SIZE - 1, Math.floor(obs.x2 / UNIT_SCALE));
      const minRow = Math.max(0, Math.floor(obs.y1 / UNIT_SCALE));
      const maxRow = Math.min(GRID_SIZE - 1, Math.floor(obs.y2 / UNIT_SCALE));
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          grid[r][c] = '#';
        }
      }
    }
  }

  // Place objective center (10,10 in grid coords)
  const objCol = 10;
  const objRow = 10;
  if (objRow < GRID_SIZE && objCol < GRID_SIZE) {
    grid[objRow][objCol] = 'O';
  }

  // Place visible actors (A, B, C...)
  const actorKey = buildActorKey(visibleActorIds, myId);
  for (const id of visibleActorIds) {
    const actor = gameState.actors[id];
    if (!actor) continue;
    const col = clampGrid(Math.floor(actor.position.x / UNIT_SCALE));
    const row = clampGrid(Math.floor(actor.position.y / UNIT_SCALE));
    grid[row][col] = actorKey[id];
  }

  // Place self last (overwrites if overlapping)
  const me = gameState.actors[myId];
  if (me) {
    const col = clampGrid(Math.floor(me.position.x / UNIT_SCALE));
    const row = clampGrid(Math.floor(me.position.y / UNIT_SCALE));
    grid[row][col] = 'Y';
  }

  // Render with row numbers
  const lines: string[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const rowLabel = String(row).padStart(2, ' ');
    lines.push(`${rowLabel} ${grid[row].join(' ')}`);
  }
  // Column header
  const colHeader = '   ' + Array.from({ length: GRID_SIZE }, (_, i) => String(i % 10)).join(' ');
  return colHeader + '\n' + lines.join('\n');
}

function clampGrid(v: number): number {
  return Math.max(0, Math.min(GRID_SIZE - 1, v));
}
