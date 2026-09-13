import { FLOOR_PENALTIES, TILE_COLORS } from './constants';
import { FIRST_PLAYER_MARKER, type GameState, type SelectionSource, type TileColor } from './types';

export interface AIMove {
  source: SelectionSource;
  color: TileColor;
  lineIndex: number | null; // null = floor
}

export interface AIOptions {
  timeMs?: number;
}

// Compact search representation: colors are indices into TILE_COLORS, tiles are per-color counts.
const COLORS = 5;
const FLOOR = 5;
const CENTER = -1;
const EMPTY_COUNTS = [0, 0, 0, 0, 0];

interface SBoard {
  score: number;
  lineColor: number[]; // -1 when empty
  lineCount: number[];
  wall: number[]; // 25 cells, row * 5 + col, 1 = filled
  floor: number;
}

interface SState {
  factories: number[][];
  center: number[];
  marker: boolean;
  markerOwner: number;
  boards: SBoard[];
  toMove: number;
}

interface SMove {
  source: number;
  color: number;
  line: number;
}

// On the wall, color c sits in row r at column (c + r) % 5.
const wallCol = (color: number, row: number) => (color + row) % COLORS;

function toSearchState(state: GameState): SState {
  const counts = (tiles: readonly (TileColor | typeof FIRST_PLAYER_MARKER)[]) => {
    const c = [0, 0, 0, 0, 0];
    for (const t of tiles) if (t !== FIRST_PLAYER_MARKER) c[TILE_COLORS.indexOf(t)]++;
    return c;
  };
  return {
    factories: state.factories.map((f) => counts(f.tiles)),
    center: counts(state.center),
    marker: state.center.includes(FIRST_PLAYER_MARKER),
    markerOwner: -1,
    toMove: state.currentPlayer,
    boards: state.players.map((p) => ({
      score: p.score,
      lineColor: p.patternLines.map((line) => {
        const tile = line.find((t) => t !== null);
        return tile ? TILE_COLORS.indexOf(tile) : -1;
      }),
      lineCount: p.patternLines.map((line) => line.filter((t) => t !== null).length),
      wall: p.wall.flatMap((row) => row.map((cell) => (cell ? 1 : 0))),
      floor: p.floor.length,
    })),
  };
}

function isRoundOver(s: SState): boolean {
  return s.center.every((n) => n === 0) && s.factories.every((f) => f.every((n) => n === 0));
}

function canPlace(b: SBoard, line: number, color: number): boolean {
  if (b.lineCount[line] >= line + 1) return false;
  if (b.lineColor[line] !== -1 && b.lineColor[line] !== color) return false;
  return b.wall[line * COLORS + wallCol(color, line)] === 0;
}

function generateMoves(s: SState): SMove[] {
  const b = s.boards[s.toMove];
  const moves: SMove[] = [];
  const addTargets = (source: number, color: number) => {
    for (let line = 0; line < 5; line++) if (canPlace(b, line, color)) moves.push({ source, color, line });
    moves.push({ source, color, line: FLOOR });
  };

  for (let c = 0; c < COLORS; c++) if (s.center[c] > 0) addTargets(CENTER, c);

  // Factories with identical contents produce identical moves; only expand one of each.
  const seen = new Set<string>();
  s.factories.forEach((f, i) => {
    const key = f.join(',');
    if (seen.has(key) || f.every((n) => n === 0)) return;
    seen.add(key);
    for (let c = 0; c < COLORS; c++) if (f[c] > 0) addTargets(i, c);
  });

  return moves;
}

function applyMove(s: SState, m: SMove): SState {
  const p = s.toMove;
  let { factories, marker, markerOwner } = s;
  const center = s.center.slice();
  let count: number;
  let tookMarker = false;

  if (m.source === CENTER) {
    count = center[m.color];
    center[m.color] = 0;
    if (marker) {
      marker = false;
      markerOwner = p;
      tookMarker = true;
    }
  } else {
    const f = factories[m.source];
    count = f[m.color];
    for (let c = 0; c < COLORS; c++) if (c !== m.color) center[c] += f[c];
    factories = factories.slice();
    factories[m.source] = EMPTY_COUNTS;
  }

  const old = s.boards[p];
  const board: SBoard = {
    score: old.score,
    lineColor: old.lineColor,
    lineCount: old.lineCount,
    wall: old.wall,
    floor: old.floor,
  };

  let overflow = count;
  if (m.line !== FLOOR) {
    const placed = Math.min(m.line + 1 - old.lineCount[m.line], count);
    board.lineColor = old.lineColor.slice();
    board.lineCount = old.lineCount.slice();
    board.lineColor[m.line] = m.color;
    board.lineCount[m.line] += placed;
    overflow = count - placed;
  }
  board.floor += overflow + (tookMarker ? 1 : 0);

  const boards = s.boards.slice();
  boards[p] = board;
  return { factories, center, marker, markerOwner, boards, toMove: (p + 1) % s.boards.length };
}

function placementPoints(wall: number[], row: number, col: number): number {
  let h = 1;
  for (let c = col - 1; c >= 0 && wall[row * 5 + c]; c--) h++;
  for (let c = col + 1; c < 5 && wall[row * 5 + c]; c++) h++;
  let v = 1;
  for (let r = row - 1; r >= 0 && wall[r * 5 + col]; r--) v++;
  for (let r = row + 1; r < 5 && wall[r * 5 + col]; r++) v++;
  if (h === 1 && v === 1) return 1;
  if (h === 1) return v;
  if (v === 1) return h;
  return h + v;
}

/** Exact end-of-round resolution: move full lines to the wall, score them, apply floor penalties. */
function resolveRound(b: SBoard): SBoard {
  const wall = b.wall.slice();
  const lineColor = b.lineColor.slice();
  const lineCount = b.lineCount.slice();
  let score = b.score;
  for (let r = 0; r < 5; r++) {
    if (lineCount[r] === r + 1) {
      const col = wallCol(lineColor[r], r);
      wall[r * 5 + col] = 1;
      score += placementPoints(wall, r, col);
      lineColor[r] = -1;
      lineCount[r] = 0;
    }
  }
  for (let i = 0; i < b.floor; i++) score += FLOOR_PENALTIES[i] ?? 0;
  return { score: Math.max(0, score), lineColor, lineCount, wall, floor: 0 };
}

function hasCompleteRow(wall: number[]): boolean {
  for (let r = 0; r < 5; r++) {
    let full = true;
    for (let c = 0; c < 5; c++) if (!wall[r * 5 + c]) full = false;
    if (full) return true;
  }
  return false;
}

function finalBonus(wall: number[]): number {
  let bonus = 0;
  for (let r = 0; r < 5; r++) {
    let full = true;
    for (let c = 0; c < 5; c++) if (!wall[r * 5 + c]) full = false;
    if (full) bonus += 2;
  }
  for (let c = 0; c < 5; c++) {
    let full = true;
    for (let r = 0; r < 5; r++) if (!wall[r * 5 + c]) full = false;
    if (full) bonus += 7;
  }
  for (let color = 0; color < COLORS; color++) {
    let full = true;
    for (let r = 0; r < 5; r++) if (!wall[r * 5 + wallCol(color, r)]) full = false;
    if (full) bonus += 10;
  }
  return bonus;
}

/** Estimated future value of a board that will keep playing: unfinished lines and bonus progress. */
function potential(b: SBoard): number {
  let value = 0;
  const wall = b.wall;

  for (let r = 0; r < 5; r++) {
    const n = b.lineCount[r];
    if (n === 0) continue;
    const col = wallCol(b.lineColor[r], r);
    const trial = wall.slice();
    trial[r * 5 + col] = 1;
    const fraction = n / (r + 1);
    value += placementPoints(trial, r, col) * (0.3 + 0.5 * fraction);
  }

  for (let i = 0; i < 5; i++) {
    let rowN = 0;
    let colN = 0;
    let colorN = 0;
    for (let j = 0; j < 5; j++) {
      rowN += wall[i * 5 + j];
      colN += wall[j * 5 + i];
      colorN += wall[j * 5 + wallCol(i, j)];
    }
    value += 2 * (rowN / 5) ** 2;
    value += 7 * 0.85 * (colN / 5) ** 2;
    value += 10 * 0.75 * (colorN / 5) ** 2;
  }

  return value;
}

const WIN_BONUS = 25;

/** Static evaluation of `s` from player `p`'s point of view (their value minus the opponent's). */
function evaluate(s: SState, p: number): number {
  const resolved = s.boards.map(resolveRound);

  if (resolved.some((b) => hasCompleteRow(b.wall))) {
    const finals = resolved.map((b) => b.score + finalBonus(b.wall));
    const diff = finals[p] - Math.max(...finals.filter((_, i) => i !== p));
    return diff + Math.sign(diff) * WIN_BONUS;
  }

  const values = resolved.map((b, i) => b.score + potential(b) + (s.markerOwner === i ? 1 : 0));
  return values[p] - Math.max(...values.filter((_, i) => i !== p));
}

class Timeout extends Error {}

/**
 * Plays the rest of the round as a two-player game with alpha-beta search. Tiles on the table are
 * known until the round ends, so this is exact within the round; leaves are scored by `evaluate`.
 */
export function chooseAIMove(state: GameState, options: AIOptions = {}): AIMove {
  const timeMs = options.timeMs ?? 800;
  const deadline = performance.now() + timeMs;
  const root = toSearchState(state);
  let nodes = 0;
  let hitDepthLimit = false;

  const orderedChildren = (s: SState, width: number) => {
    const children = generateMoves(s).map((m) => {
      const child = applyMove(s, m);
      return { m, child, score: evaluate(child, s.toMove) };
    });
    children.sort((a, b) => b.score - a.score);
    return children.slice(0, width);
  };

  const negamax = (s: SState, depth: number, ply: number, alpha: number, beta: number): number => {
    if ((++nodes & 255) === 0 && performance.now() > deadline) throw new Timeout();
    if (isRoundOver(s)) return evaluate(s, s.toMove);
    if (depth === 0) {
      hitDepthLimit = true;
      return evaluate(s, s.toMove);
    }
    let best = -Infinity;
    for (const { child } of orderedChildren(s, ply === 1 ? 12 : 8)) {
      const v = -negamax(child, depth - 1, ply + 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  let rootChildren = orderedChildren(root, Infinity);
  let bestMove = rootChildren[0].m;

  try {
    for (let depth = 1; ; depth++) {
      hitDepthLimit = false;
      let alpha = -Infinity;
      const scored: typeof rootChildren = [];
      for (const entry of rootChildren) {
        const v = -negamax(entry.child, depth - 1, 1, -Infinity, -alpha);
        scored.push({ ...entry, score: v });
        if (v > alpha) alpha = v;
      }
      scored.sort((a, b) => b.score - a.score);
      rootChildren = scored;
      bestMove = scored[0].m;
      // Every explored line reached the end of the round, so searching deeper changes nothing.
      if (!hitDepthLimit) break;
    }
  } catch (e) {
    if (!(e instanceof Timeout)) throw e;
  }

  return {
    source: bestMove.source === CENTER ? { type: 'center' } : { type: 'factory', factoryId: state.factories[bestMove.source].id },
    color: TILE_COLORS[bestMove.color],
    lineIndex: bestMove.line === FLOOR ? null : bestMove.line,
  };
}
