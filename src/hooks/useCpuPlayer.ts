import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { AIMove } from '../game/ai';
import type { Action } from '../game/reducer';
import type { GameState } from '../game/types';

const PICK_DELAY = 350;
const PLACE_DELAY = 1000;

/**
 * Plays the CPU's turns: the search runs in a Web Worker so animations stay smooth, then the pick and the
 * placement are dispatched with a pause between them so the player can follow the move.
 * Returns the CPU's planned move while it is holding tiles, for previews.
 */
export function useCpuPlayer(state: GameState, dispatch: Dispatch<Action>, paused: boolean): AIMove | null {
  const [plan, setPlan] = useState<AIMove | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);

  const player = state.players[state.currentPlayer];
  const cpuTurn = state.phase === 'drafting' && !!player?.isCPU && !state.lastRoundSummary && !paused;
  const holding = cpuTurn && !!state.selection;

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!cpuTurn || state.selection) return;
    const id = ++requestId.current;
    let cancelled = false;

    const timer = setTimeout(() => {
      workerRef.current ??= new Worker(new URL('../game/ai.worker.ts', import.meta.url), { type: 'module' });
      const worker = workerRef.current;
      const onMessage = (event: MessageEvent<{ id: number; move: AIMove }>) => {
        if (event.data.id !== id) return;
        worker.removeEventListener('message', onMessage);
        if (cancelled) return;
        const { move } = event.data;
        setPlan(move);
        dispatch(
          move.source.type === 'factory'
            ? { type: 'PICK_FACTORY', factoryId: move.source.factoryId, color: move.color }
            : { type: 'PICK_CENTER', color: move.color },
        );
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ id, state });
    }, PICK_DELAY);

    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [cpuTurn, state, dispatch]);

  useEffect(() => {
    if (!holding) return;
    if (!plan) {
      dispatch({ type: 'CANCEL_SELECTION' });
      return;
    }
    const timer = setTimeout(() => {
      setPlan(null);
      dispatch(plan.lineIndex === null ? { type: 'PLACE_ON_FLOOR' } : { type: 'PLACE_ON_LINE', lineIndex: plan.lineIndex });
    }, PLACE_DELAY);
    return () => clearTimeout(timer);
  }, [holding, plan, dispatch]);

  return state.selection && player?.isCPU ? plan : null;
}
