import type { CSSProperties } from 'react';
import type { AIMove } from '../game/ai';
import { TILE_COLOR_LABEL } from '../game/constants';
import { previewPlacement, type PlacementTarget } from '../game/preview';
import type { GameState, Selection } from '../game/types';
import { MarkerTile, Tile } from './Tile';

interface StatusBarProps {
  state: GameState;
  cpuPlan: AIMove | null;
  hoverTarget: PlacementTarget | null;
  onDiscard: () => void;
}

function HeldTiles({ selection, marker }: { selection: Selection; marker: boolean }) {
  return (
    <span className="status-chips">
      {Array.from({ length: selection.count }).map((_, i) => (
        <Tile key={i} color={selection.color} size="sm" style={{ '--i': i } as CSSProperties} />
      ))}
      {marker && <MarkerTile size="sm" />}
    </span>
  );
}

const lineName = (target: PlacementTarget) => (target === 'floor' ? 'the floor' : `line ${target + 1}`);

export function StatusBar({ state, cpuPlan, hoverTarget, onDiscard }: StatusBarProps) {
  const player = state.players[state.currentPlayer];
  const { selection } = state;

  if (state.phase === 'game-over') {
    return (
      <div className="status-bar" key="game-over">
        <span className="status-text">
          <strong>Game over</strong> — final bonuses have been added.
        </span>
      </div>
    );
  }

  if (state.phase !== 'drafting' || !player) return <div className="status-bar" />;

  if (state.lastRoundSummary) {
    return (
      <div className="status-bar" key="round-over">
        <span className="status-text">
          <strong>Round {state.roundNumber - 1} complete</strong> — tiles moved to the walls.
        </span>
      </div>
    );
  }

  if (selection && player.isCPU) {
    return (
      <div className="status-bar cpu" key="cpu-holding">
        <HeldTiles selection={selection} marker={state.pendingMarker} />
        <span className="status-text">
          CPU took {selection.count} {TILE_COLOR_LABEL[selection.color].toLowerCase()}
          {cpuPlan && (
            <>
              {' '}
              → <strong>{lineName(cpuPlan.lineIndex ?? 'floor')}</strong>
            </>
          )}
        </span>
      </div>
    );
  }

  if (player.isCPU) {
    return (
      <div className="status-bar cpu" key="cpu-thinking">
        <span className="status-text">
          CPU is thinking
          <span className="thinking-dots">
            <span />
            <span />
            <span />
          </span>
        </span>
      </div>
    );
  }

  if (selection) {
    const preview =
      hoverTarget !== null
        ? previewPlacement(player, selection.color, selection.count, state.pendingMarker, hoverTarget)
        : null;
    return (
      <div className="status-bar holding" key="holding">
        <HeldTiles selection={selection} marker={state.pendingMarker} />
        <span className="status-text">
          {!preview || hoverTarget === null ? (
            'Choose a pattern line or the floor.'
          ) : (
            <>
              <strong>{hoverTarget === 'floor' ? 'Floor' : `Line ${hoverTarget + 1}`}</strong>
              {hoverTarget !== 'floor' &&
                (preview.completesLine ? (
                  <span className="pos"> · completes, +{preview.linePoints} at round end</span>
                ) : (
                  <span> · {preview.lineTiles} placed</span>
                ))}
              {preview.floorTiles > 0 && (
                <span className="neg">
                  {' '}
                  · {preview.floorTiles} to floor ({preview.floorPenalty})
                </span>
              )}
            </>
          )}
        </span>
        <span className="key-hints">
          <kbd>1</kbd>–<kbd>5</kbd> line <kbd>F</kbd> floor <kbd>Esc</kbd> discard
        </span>
        <button type="button" className="discard-button" onClick={onDiscard}>
          Discard pick
        </button>
      </div>
    );
  }

  return (
    <div className="status-bar" key="picking">
      <span className="status-text">
        <strong>Your turn</strong> — pick a color from a factory or the center.
      </span>
    </div>
  );
}
