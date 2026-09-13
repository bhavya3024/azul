import {
  FLOOR_PENALTIES,
  TILES_PER_COLOR,
  TILE_COLORS,
  WALL_PATTERN,
  WALL_SIZE,
  factoryCountForPlayers,
} from './constants';
import {
  FIRST_PLAYER_MARKER,
  type Factory,
  type FirstPlayerMarker,
  type GameState,
  type PlayerBoard,
  type PlayerSetup,
  type RoundSummaryEntry,
  type TileColor,
} from './types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createFullBag(): TileColor[] {
  const bag: TileColor[] = [];
  for (const color of TILE_COLORS) {
    for (let i = 0; i < TILES_PER_COLOR; i++) bag.push(color);
  }
  return shuffle(bag);
}

function createEmptyPlayer(setup: PlayerSetup): PlayerBoard {
  return {
    name: setup.name,
    isCPU: setup.isCPU,
    score: 0,
    patternLines: [0, 1, 2, 3, 4].map((row) => new Array(row + 1).fill(null)),
    wall: Array.from({ length: WALL_SIZE }, () => new Array(WALL_SIZE).fill(null)),
    floor: [],
  };
}

/** Draws `count` tiles from bag, reshuffling discard into bag if needed. */
function drawTiles(bag: TileColor[], discard: TileColor[], count: number) {
  let workingBag = [...bag];
  let workingDiscard = [...discard];
  const drawn: TileColor[] = [];
  for (let i = 0; i < count; i++) {
    if (workingBag.length === 0) {
      if (workingDiscard.length === 0) break; // truly out of tiles
      workingBag = shuffle(workingDiscard);
      workingDiscard = [];
    }
    drawn.push(workingBag.pop() as TileColor);
  }
  return { drawn, bag: workingBag, discard: workingDiscard };
}

function fillFactories(
  bag: TileColor[],
  discard: TileColor[],
  numFactories: number,
): { factories: Factory[]; bag: TileColor[]; discard: TileColor[] } {
  let workingBag = bag;
  let workingDiscard = discard;
  const factories: Factory[] = [];
  for (let i = 0; i < numFactories; i++) {
    const { drawn, bag: nb, discard: nd } = drawTiles(workingBag, workingDiscard, 4);
    workingBag = nb;
    workingDiscard = nd;
    factories.push({ id: i, tiles: drawn });
  }
  return { factories, bag: workingBag, discard: workingDiscard };
}

export function createInitialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    currentPlayer: 0,
    factories: [],
    center: [],
    bag: [],
    discard: [],
    selection: null,
    pendingMarker: false,
    preSelection: null,
    firstPlayerNextRound: 0,
    roundNumber: 1,
    message: null,
    lastRoundSummary: null,
    winner: null,
  };
}

export function initGame(playerSetups: PlayerSetup[]): GameState {
  const players = playerSetups.map(createEmptyPlayer);
  const bag = createFullBag();
  const numFactories = factoryCountForPlayers(players.length);
  const { factories, bag: bagAfter, discard } = fillFactories(bag, [], numFactories);

  return {
    phase: 'drafting',
    players,
    currentPlayer: 0,
    factories,
    center: [FIRST_PLAYER_MARKER],
    bag: bagAfter,
    discard,
    selection: null,
    pendingMarker: false,
    preSelection: null,
    firstPlayerNextRound: 0,
    roundNumber: 1,
    message: null,
    lastRoundSummary: null,
    winner: null,
  };
}

export function canPlaceOnLine(player: PlayerBoard, lineIndex: number, color: TileColor): boolean {
  const line = player.patternLines[lineIndex];
  const capacity = line.length;
  const filledCount = line.filter((t) => t !== null).length;
  if (filledCount >= capacity) return false;
  const existingColor = line.find((t) => t !== null);
  if (existingColor && existingColor !== color) return false;
  // Can't place if wall row already has this color placed
  const wallRow = player.wall[lineIndex];
  if (wallRow[WALL_PATTERN[lineIndex].indexOf(color)] !== null) return false;
  return true;
}

export function isFactoryEmpty(state: GameState): boolean {
  return state.factories.every((f) => f.tiles.length === 0) && state.center.length === 0;
}

/** Applies taking `color` tiles from a factory: remaining tiles go to center. */
export function takeFromFactory(state: GameState, factoryId: number, color: TileColor): GameState {
  const factory = state.factories.find((f) => f.id === factoryId);
  if (!factory) return state;
  const taken = factory.tiles.filter((t) => t === color);
  const remaining = factory.tiles.filter((t) => t !== color);

  const factories = state.factories.map((f) => (f.id === factoryId ? { ...f, tiles: [] } : f));
  const center = [...state.center, ...remaining];

  return {
    ...state,
    factories,
    center,
    selection: { source: { type: 'factory', factoryId }, color, count: taken.length },
    preSelection: { factories: state.factories, center: state.center },
  };
}

export function takeFromCenter(state: GameState, color: TileColor): GameState {
  const hasMarker = state.center.includes(FIRST_PLAYER_MARKER);
  const taken = state.center.filter((t) => t === color);
  const remainingCenter = state.center.filter((t) => t !== color && t !== FIRST_PLAYER_MARKER);

  return {
    ...state,
    center: remainingCenter,
    selection: { source: { type: 'center' }, color, count: taken.length },
    pendingMarker: hasMarker,
    preSelection: { factories: state.factories, center: state.center },
  };
}

/** Reverts the current selection, restoring factories/center to how they were before it was picked. */
export function cancelSelection(state: GameState): GameState {
  if (!state.selection || !state.preSelection) return state;
  return {
    ...state,
    factories: state.preSelection.factories,
    center: state.preSelection.center,
    selection: null,
    pendingMarker: false,
    preSelection: null,
  };
}

/** Places the currently selected tiles onto a pattern line (or the floor if lineIndex is null). */
export function placeSelection(
  state: GameState,
  lineIndex: number | null,
): GameState {
  if (!state.selection) return state;
  const { color, count } = state.selection;
  const pendingMarker = state.pendingMarker;

  const players = state.players.map((p, idx) => {
    if (idx !== state.currentPlayer) return p;
    const player: PlayerBoard = {
      ...p,
      patternLines: p.patternLines.map((line) => [...line]),
      floor: [...p.floor],
    };

    let toPlace = count;
    if (lineIndex !== null) {
      const line = player.patternLines[lineIndex];
      const capacity = line.length;
      const filledCount = line.filter((t) => t !== null).length;
      const space = capacity - filledCount;
      const placed = Math.min(space, toPlace);
      for (let i = 0; i < placed; i++) {
        const emptyIdx = line.lastIndexOf(null);
        line[emptyIdx] = color;
      }
      toPlace -= placed;
    }

    // Overflow (or explicit floor placement) goes to floor line
    for (let i = 0; i < toPlace; i++) {
      player.floor.push(color);
    }
    if (pendingMarker) {
      player.floor.push(FIRST_PLAYER_MARKER);
    }

    return player;
  });

  const nextFirstPlayer = pendingMarker ? state.currentPlayer : state.firstPlayerNextRound;

  const nextState: GameState = {
    ...state,
    players,
    selection: null,
    pendingMarker: false,
    preSelection: null,
    firstPlayerNextRound: nextFirstPlayer,
    currentPlayer: (state.currentPlayer + 1) % state.players.length,
  };

  return nextState;
}

export function scoreTilePlacement(wall: (TileColor | null)[][], row: number, col: number): number {
  let horizontal = 1;
  for (let c = col - 1; c >= 0 && wall[row][c] !== null; c--) horizontal++;
  for (let c = col + 1; c < WALL_SIZE && wall[row][c] !== null; c++) horizontal++;

  let vertical = 1;
  for (let r = row - 1; r >= 0 && wall[r][col] !== null; r--) vertical++;
  for (let r = row + 1; r < WALL_SIZE && wall[r][col] !== null; r++) vertical++;

  if (horizontal === 1 && vertical === 1) return 1;
  if (horizontal === 1) return vertical;
  if (vertical === 1) return horizontal;
  return horizontal + vertical;
}

export interface RoundEndResult {
  state: GameState;
  summary: RoundSummaryEntry[];
}

export function resolveRoundEnd(state: GameState): RoundEndResult {
  let discard = [...state.discard];
  const summary: RoundSummaryEntry[] = [];

  const players = state.players.map((p) => {
    const player: PlayerBoard = {
      ...p,
      patternLines: p.patternLines.map((line) => [...line]),
      wall: p.wall.map((row) => [...row]),
      floor: [...p.floor],
    };

    let wallPoints = 0;

    player.patternLines.forEach((line, rowIndex) => {
      const capacity = line.length;
      const filled = line.filter((t) => t !== null).length;
      if (filled === capacity) {
        const color = line[0] as TileColor;
        const col = WALL_PATTERN[rowIndex].indexOf(color);
        player.wall[rowIndex][col] = color;
        wallPoints += scoreTilePlacement(player.wall, rowIndex, col);
        // remaining tiles in line (capacity - 1) go to discard
        for (let i = 0; i < capacity - 1; i++) discard.push(color);
        player.patternLines[rowIndex] = new Array(capacity).fill(null);
      }
    });

    let floorPenalty = 0;
    player.floor.forEach((tile, i) => {
      // Tiles past the last floor space go to the box without a penalty.
      const penalty = FLOOR_PENALTIES[i] ?? 0;
      floorPenalty += penalty;
      if (tile !== FIRST_PLAYER_MARKER) discard.push(tile);
    });
    player.floor = [];

    const rawScore = player.score + wallPoints + floorPenalty;
    player.score = Math.max(0, rawScore);

    summary.push({ player: player.name, wallPoints, floorPenalty });

    return player;
  });

  const anyRowComplete = players.some((p) => p.wall.some((row) => row.every((cell) => cell !== null)));

  let nextState: GameState = {
    ...state,
    players,
    discard,
    lastRoundSummary: summary,
  };

  if (anyRowComplete) {
    nextState = applyFinalBonuses(nextState);
    const topScore = Math.max(...nextState.players.map((p) => p.score));
    nextState.winner = nextState.players
      .map((p, i) => (p.score === topScore ? i : -1))
      .filter((i) => i >= 0);
    nextState.phase = 'game-over';
  } else {
    const numFactories = factoryCountForPlayers(state.players.length);
    const { factories, bag: newBag, discard: newDiscard } = fillFactories(state.bag, discard, numFactories);
    nextState = {
      ...nextState,
      factories,
      bag: newBag,
      discard: newDiscard,
      center: [FIRST_PLAYER_MARKER],
      currentPlayer: state.firstPlayerNextRound,
      firstPlayerNextRound: state.firstPlayerNextRound,
      roundNumber: state.roundNumber + 1,
      phase: 'drafting',
    };
  }

  return { state: nextState, summary };
}

function applyFinalBonuses(state: GameState): GameState {
  const players = state.players.map((p) => {
    let bonus = 0;
    // rows
    bonus += p.wall.filter((row) => row.every((c) => c !== null)).length * 2;
    // columns
    for (let c = 0; c < WALL_SIZE; c++) {
      if (p.wall.every((row) => row[c] !== null)) bonus += 7;
    }
    // colors
    for (const color of TILE_COLORS) {
      let countForColor = 0;
      for (let r = 0; r < WALL_SIZE; r++) {
        if (p.wall[r].some((cell) => cell === color)) countForColor++;
      }
      if (countForColor === WALL_SIZE) bonus += 10;
    }
    return { ...p, score: p.score + bonus };
  });
  return { ...state, players };
}

export function tileOwnerLabel(tile: TileColor | FirstPlayerMarker): string {
  return tile === FIRST_PLAYER_MARKER ? 'marker' : tile;
}
