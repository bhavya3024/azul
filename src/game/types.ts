export type TileColor = 'blue' | 'yellow' | 'red' | 'black' | 'cyan';

export const FIRST_PLAYER_MARKER = 'first-player-marker' as const;
export type FirstPlayerMarker = typeof FIRST_PLAYER_MARKER;

export type Tile = TileColor;

export interface Factory {
  id: number;
  tiles: TileColor[];
}

export interface PlayerBoard {
  name: string;
  isCPU: boolean;
  score: number;
  patternLines: (TileColor | null)[][]; // 5 rows, row i has capacity i+1
  wall: (TileColor | null)[][]; // 5x5, filled colors
  floor: (TileColor | FirstPlayerMarker)[];
}

export interface PlayerSetup {
  name: string;
  isCPU: boolean;
}

export type SelectionSource =
  | { type: 'factory'; factoryId: number }
  | { type: 'center' };

export interface Selection {
  source: SelectionSource;
  color: TileColor;
  count: number;
}

export type Phase = 'setup' | 'drafting' | 'round-end' | 'game-over';

export interface GameState {
  phase: Phase;
  players: PlayerBoard[];
  currentPlayer: number;
  factories: Factory[];
  center: (TileColor | FirstPlayerMarker)[];
  bag: TileColor[];
  discard: TileColor[];
  selection: Selection | null;
  pendingMarker: boolean;
  /** Snapshot of factories/center taken right before the current selection, to support cancelling it. */
  preSelection: { factories: Factory[]; center: (TileColor | FirstPlayerMarker)[] } | null;
  firstPlayerNextRound: number;
  roundNumber: number;
  message: string | null;
  lastRoundSummary: RoundSummaryEntry[] | null;
  winner: number[] | null;
}

export interface RoundSummaryEntry {
  player: string;
  wallPoints: number;
  floorPenalty: number;
}
