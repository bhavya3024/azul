import type { CSSProperties } from 'react';
import { FLOOR_PENALTIES, TILE_COLOR_HEX, WALL_PATTERN } from '../game/constants';
import { canPlaceOnLine } from '../game/engine';
import { previewPlacement, type PlacementTarget } from '../game/preview';
import { FIRST_PLAYER_MARKER, type PlayerBoard, type Selection } from '../game/types';
import { AnimatedScore } from './AnimatedScore';
import { pressable } from './pressable';
import { MarkerTile, Slot, Tile } from './Tile';

interface PlayerBoardViewProps {
  player: PlayerBoard;
  isActive: boolean;
  thinking: boolean;
  holding: { selection: Selection; marker: boolean } | null;
  target: PlacementTarget | null;
  /** True when the human is holding tiles and can click this board. */
  interactive: boolean;
  onTargetChange: (target: PlacementTarget | null) => void;
  onPlaceLine: (lineIndex: number) => void;
  onPlaceFloor: () => void;
}

export function PlayerBoardView({
  player,
  isActive,
  thinking,
  holding,
  target,
  interactive,
  onTargetChange,
  onPlaceLine,
  onPlaceFloor,
}: PlayerBoardViewProps) {
  const heldColor = holding?.selection.color ?? null;
  const preview =
    holding && target !== null
      ? previewPlacement(player, holding.selection.color, holding.selection.count, holding.marker, target)
      : null;

  const hoverProps = (t: PlacementTarget) =>
    interactive
      ? {
          onMouseEnter: () => onTargetChange(t),
          onMouseLeave: () => onTargetChange(null),
          onFocus: () => onTargetChange(t),
          onBlur: () => onTargetChange(null),
        }
      : {};

  const floorGhosts = preview?.floorTiles ?? 0;
  const floorExtra = player.floor.length + floorGhosts - FLOOR_PENALTIES.length;

  return (
    <div className={`player-board ${isActive ? 'player-board-active' : ''}`}>
      <div className="player-board-header">
        <span className="player-name">
          {player.name}
          {player.isCPU && <span className="cpu-badge">CPU</span>}
          {thinking && (
            <span className="thinking-dots" aria-label="thinking">
              <span />
              <span />
              <span />
            </span>
          )}
        </span>
        <AnimatedScore value={player.score} />
      </div>

      <div className="player-board-main">
        <div className="pattern-lines">
          {player.patternLines.map((line, rowIndex) => {
            const droppable = interactive && heldColor !== null && canPlaceOnLine(player, rowIndex, heldColor);
            const blocked = interactive && !droppable;
            const targeted = target === rowIndex;
            const emptyIndexes = line.flatMap((cell, i) => (cell === null ? [i] : []));
            const ghostCount = targeted && preview ? preview.lineTiles : 0;
            const firstGhost = emptyIndexes.length - ghostCount;

            const classes = [
              'pattern-line',
              droppable && 'droppable',
              blocked && 'blocked',
              targeted && (interactive ? 'targeted' : 'cpu-target'),
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={rowIndex}
                className={classes}
                {...(droppable ? { ...pressable(() => onPlaceLine(rowIndex)), ...hoverProps(rowIndex) } : {})}
                aria-label={droppable ? `Place on line ${rowIndex + 1}` : undefined}
              >
                {line.map((cell, i) => {
                  if (cell) return <Tile key={`t-${i}`} color={cell} size="lg" />;
                  if (heldColor && ghostCount > 0 && emptyIndexes.indexOf(i) >= firstGhost) {
                    return <Tile key={`g-${i}`} color={heldColor} size="lg" className="ghost" />;
                  }
                  return <Slot key={`s-${i}`} size="lg" />;
                })}
              </div>
            );
          })}
        </div>

        <div className="wall-grid">
          {player.wall.map((row, r) =>
            row.map((cell, c) => {
              if (cell) return <Tile key={`w-${r}-${c}`} color={cell} size="lg" className="wall-filled" />;
              const pattern = WALL_PATTERN[r][c];
              const isTarget = heldColor === pattern && target === r;
              const completes = isTarget && preview?.completesLine;
              return (
                <div
                  key={`e-${r}-${c}`}
                  className={`wall-empty tile-lg ${isTarget ? 'wall-target' : ''} ${completes ? 'complete' : ''}`}
                  style={{ '--tile-color': TILE_COLOR_HEX[pattern] } as CSSProperties}
                >
                  {completes && <span className="wall-points">+{preview!.linePoints}</span>}
                </div>
              );
            }),
          )}
        </div>
      </div>

      <div
        className={`floor-line ${interactive ? 'droppable' : ''} ${target === 'floor' ? (interactive ? 'targeted' : 'cpu-target') : ''}`}
        {...(interactive ? { ...pressable(onPlaceFloor), ...hoverProps('floor') } : {})}
        aria-label={interactive ? 'Place on the floor' : undefined}
      >
        <span className="floor-label">Floor</span>
        {FLOOR_PENALTIES.map((penalty, i) => {
          const tile = player.floor[i];
          let content;
          if (tile === FIRST_PLAYER_MARKER) {
            content = <MarkerTile key={`m-${i}`} size="sm" />;
          } else if (tile) {
            content = <Tile key={`t-${i}`} color={tile} size="sm" />;
          } else if (heldColor && i < player.floor.length + floorGhosts) {
            const markerGhost = holding?.marker && i === player.floor.length + floorGhosts - 1;
            content = markerGhost ? (
              <MarkerTile key={`gm-${i}`} size="sm" className="ghost" />
            ) : (
              <Tile key={`g-${i}`} color={heldColor} size="sm" className="ghost" />
            );
          } else {
            content = <Slot key={`s-${i}`} size="sm" />;
          }
          return (
            <div key={i} className="floor-slot">
              <span className="floor-penalty">{penalty}</span>
              {content}
            </div>
          );
        })}
        {floorExtra > 0 && <span className="floor-extra">+{floorExtra} to box</span>}
        {preview && preview.floorTiles > 0 && <span className="floor-preview">{preview.floorPenalty} pts</span>}
      </div>
    </div>
  );
}
