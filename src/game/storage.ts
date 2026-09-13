import { cancelSelection } from './engine';
import type { GameState } from './types';

const GAME_KEY = 'azul:game';
const NAME_KEY = 'azul:player-name';
const VERSION = 1;

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.version !== VERSION) return null;
    const state = saved.state as GameState;
    const validPhase = state?.phase === 'drafting' || state?.phase === 'game-over';
    if (!validPhase || !Array.isArray(state.players) || state.players.length !== 2 || !Array.isArray(state.factories)) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    if (state.phase === 'setup') {
      localStorage.removeItem(GAME_KEY);
      return;
    }
    // The CPU's chosen destination lives only in memory, so a half-finished CPU move is saved as not yet picked.
    const cpuHolding = !!state.selection && state.players[state.currentPlayer]?.isCPU;
    const toSave = cpuHolding ? cancelSelection(state) : state;
    localStorage.setItem(GAME_KEY, JSON.stringify({ version: VERSION, state: toSave }));
  } catch {
    // Storage can be unavailable (private mode, quota); the game still plays without saving.
  }
}

export function loadPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || 'You';
  } catch {
    return 'You';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Ignore: remembering the name is a convenience only.
  }
}
