import {
  cancelSelection,
  canPlaceOnLine,
  createInitialState,
  initGame,
  placeSelection,
  resolveRoundEnd,
  takeFromCenter,
  takeFromFactory,
} from './engine';
import { FIRST_PLAYER_MARKER, type GameState, type PlayerSetup, type TileColor } from './types';

export type Action =
  | { type: 'START_GAME'; players: PlayerSetup[] }
  | { type: 'PICK_FACTORY'; factoryId: number; color: TileColor }
  | { type: 'PICK_CENTER'; color: TileColor }
  | { type: 'CANCEL_SELECTION' }
  | { type: 'PLACE_ON_LINE'; lineIndex: number }
  | { type: 'PLACE_ON_FLOOR' }
  | { type: 'CONTINUE_AFTER_ROUND' }
  | { type: 'RESTART' };

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
      return initGame(action.players);

    case 'RESTART':
      return createInitialState();

    case 'PICK_FACTORY': {
      if (state.phase !== 'drafting' || state.selection) return state;
      return takeFromFactory(state, action.factoryId, action.color);
    }

    case 'PICK_CENTER': {
      if (state.phase !== 'drafting' || state.selection) return state;
      return takeFromCenter(state, action.color);
    }

    case 'CANCEL_SELECTION': {
      if (!state.selection) return state;
      return cancelSelection(state);
    }

    case 'PLACE_ON_LINE': {
      if (!state.selection) return state;
      const player = state.players[state.currentPlayer];
      if (!canPlaceOnLine(player, action.lineIndex, state.selection.color)) return state;
      const afterPlace = placeSelection(state, action.lineIndex);
      return maybeEndRound(afterPlace);
    }

    case 'PLACE_ON_FLOOR': {
      if (!state.selection) return state;
      const afterPlace = placeSelection(state, null);
      return maybeEndRound(afterPlace);
    }

    case 'CONTINUE_AFTER_ROUND':
      return { ...state, lastRoundSummary: null };

    default:
      return state;
  }
}

function maybeEndRound(state: GameState): GameState {
  const factoriesEmpty = state.factories.every((f) => f.tiles.length === 0);
  const centerEmpty = state.center.every((t) => t === FIRST_PLAYER_MARKER);
  if (factoriesEmpty && centerEmpty) {
    const { state: nextState } = resolveRoundEnd(state);
    return nextState;
  }
  return state;
}
