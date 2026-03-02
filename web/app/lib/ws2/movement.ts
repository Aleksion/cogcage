import { ARENA_SIZE, UNIT_SCALE } from './constants.ts';
import { directionFromVector } from './geometry.ts';

type Position = { x: number; y: number };

function stepToward(from: Position, to: Position): Position {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let next: Position;
  if (Math.abs(dx) >= Math.abs(dy)) {
    next = { x: from.x + Math.sign(dx) * UNIT_SCALE, y: from.y };
  } else {
    next = { x: from.x, y: from.y + Math.sign(dy) * UNIT_SCALE };
  }
  next.x = Math.max(0, Math.min(ARENA_SIZE, next.x));
  next.y = Math.max(0, Math.min(ARENA_SIZE, next.y));
  return next;
}

function autoMoveDir(actorPos: Position, targetPos: Position): string {
  const step = stepToward(actorPos, targetPos);
  const dx = step.x - actorPos.x;
  const dy = step.y - actorPos.y;
  if (dx === 0 && dy === 0) return 'N';
  return directionFromVector(dx, dy);
}

export function deriveMovementDirection(
  actionType: string | undefined,
  actorPos: Position,
  targetPos: Position,
  existingDir?: string,
): string | undefined {
  if (actionType !== 'MOVE' && actionType !== 'DASH') return existingDir;
  if (existingDir) return existingDir;
  return autoMoveDir(actorPos, targetPos);
}
