import { chooseAIMove } from './ai';
import type { GameState } from './types';

self.onmessage = (event: MessageEvent<{ id: number; state: GameState }>) => {
  self.postMessage({ id: event.data.id, move: chooseAIMove(event.data.state) });
};
