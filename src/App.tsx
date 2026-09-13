import { useCallback, useEffect, useReducer, useState } from 'react';
import './App.css';
import { CenterPool } from './components/CenterPool';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FactoryDisplay } from './components/FactoryDisplay';
import { GameOverModal } from './components/GameOverModal';
import { PlayerBoardView } from './components/PlayerBoardView';
import { RoundSummaryModal } from './components/RoundSummaryModal';
import { SetupScreen } from './components/SetupScreen';
import { StatusBar } from './components/StatusBar';
import { canPlaceOnLine, createInitialState } from './game/engine';
import type { PlacementTarget } from './game/preview';
import { gameReducer } from './game/reducer';
import { loadGame, saveGame } from './game/storage';
import type { Selection } from './game/types';
import { useCpuPlayer } from './hooks/useCpuPlayer';

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadGame() ?? createInitialState());
  const [toast, setToast] = useState<string | null>(() =>
    state.phase === 'drafting' ? 'Welcome back! Your saved game was restored.' : null,
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Hover is tied to the pick it happened during, so a row hovered on an earlier turn can't show a preview later.
  const [hover, setHover] = useState<{ selection: Selection | null; target: PlacementTarget } | null>(null);
  const cpuPlan = useCpuPlayer(state, dispatch, confirmingCancel);

  useEffect(() => saveGame(state), [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const current = state.players[state.currentPlayer];
  const humanTurn = state.phase === 'drafting' && !!current && !current.isCPU && !state.lastRoundSummary;
  const humanHolding = humanTurn && !!state.selection;
  const humanPicking = humanTurn && !state.selection;
  const hoverTarget =
    humanHolding &&
    hover &&
    hover.selection === state.selection &&
    (hover.target === 'floor' || canPlaceOnLine(current, hover.target, state.selection!.color))
      ? hover.target
      : null;
  const changeHoverTarget = (target: PlacementTarget | null) =>
    setHover(target === null ? null : { selection: state.selection, target });

  useEffect(() => {
    if (!humanHolding || confirmingCancel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'Escape') dispatch({ type: 'CANCEL_SELECTION' });
      else if (event.key >= '1' && event.key <= '5') dispatch({ type: 'PLACE_ON_LINE', lineIndex: Number(event.key) - 1 });
      else if (event.key === 'f' || event.key === 'F' || event.key === '0') dispatch({ type: 'PLACE_ON_FLOOR' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [humanHolding, confirmingCancel]);

  const closeConfirm = useCallback(() => setConfirmingCancel(false), []);

  if (state.phase === 'setup') {
    return (
      <div className="app-root">
        <SetupScreen onStart={(players) => dispatch({ type: 'START_GAME', players })} />
      </div>
    );
  }

  const cancelGame = () => {
    setConfirmingCancel(false);
    setHover(null);
    dispatch({ type: 'RESTART' });
  };

  return (
    <div className="app-root">
      <header className="game-header">
        <h1 className="brand">Azul</h1>
        <div className="header-actions">
          <span className="round-chip" key={state.roundNumber}>
            Round {state.roundNumber}
          </span>
          {state.phase === 'drafting' && (
            <button type="button" className="ghost-button" onClick={() => setConfirmingCancel(true)}>
              Cancel game
            </button>
          )}
        </div>
      </header>

      <StatusBar
        state={state}
        cpuPlan={cpuPlan}
        hoverTarget={hoverTarget}
        onDiscard={() => dispatch({ type: 'CANCEL_SELECTION' })}
      />

      <section className="draft-area">
        <div className="factories-grid">
          {state.factories.map((factory) => (
            <FactoryDisplay
              key={factory.id}
              factory={factory}
              round={state.roundNumber}
              disabled={!humanPicking || factory.tiles.length === 0}
              highlight={cpuPlan?.source.type === 'factory' && cpuPlan.source.factoryId === factory.id}
              onPick={(color) => dispatch({ type: 'PICK_FACTORY', factoryId: factory.id, color })}
            />
          ))}
        </div>
        <CenterPool
          center={state.center}
          disabled={!humanPicking}
          highlight={cpuPlan?.source.type === 'center'}
          onPick={(color) => dispatch({ type: 'PICK_CENTER', color })}
        />
      </section>

      <section className="players-area">
        {state.players.map((player, i) => {
          const isCurrent = state.phase === 'drafting' && i === state.currentPlayer;
          const holding = isCurrent && state.selection ? { selection: state.selection, marker: state.pendingMarker } : null;
          const target = !holding
            ? null
            : player.isCPU
              ? cpuPlan
                ? (cpuPlan.lineIndex ?? 'floor')
                : null
              : hoverTarget;
          return (
            <PlayerBoardView
              key={i}
              player={player}
              isActive={isCurrent}
              thinking={isCurrent && player.isCPU && !state.selection && !state.lastRoundSummary}
              holding={holding}
              target={target}
              interactive={!!holding && !player.isCPU}
              onTargetChange={changeHoverTarget}
              onPlaceLine={(lineIndex) => dispatch({ type: 'PLACE_ON_LINE', lineIndex })}
              onPlaceFloor={() => dispatch({ type: 'PLACE_ON_FLOOR' })}
            />
          );
        })}
      </section>

      {state.lastRoundSummary && state.phase === 'drafting' && (
        <RoundSummaryModal
          summary={state.lastRoundSummary}
          roundNumber={state.roundNumber}
          onContinue={() => dispatch({ type: 'CONTINUE_AFTER_ROUND' })}
        />
      )}

      {state.phase === 'game-over' && state.winner && (
        <GameOverModal players={state.players} winner={state.winner} onRestart={() => dispatch({ type: 'RESTART' })} />
      )}

      {confirmingCancel && (
        <ConfirmDialog
          title="Cancel this game?"
          message="Your progress will be lost and you'll go back to the start screen."
          confirmLabel="Cancel game"
          cancelLabel="Keep playing"
          onConfirm={cancelGame}
          onCancel={closeConfirm}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
