import { useState, type CSSProperties } from 'react';
import { TILE_COLORS, TILE_COLOR_LABEL } from '../game/constants';
import { FIRST_PLAYER_MARKER, type FirstPlayerMarker, type TileColor } from '../game/types';
import { pressable } from './pressable';
import { MarkerTile, Tile } from './Tile';

interface CenterPoolProps {
  center: (TileColor | FirstPlayerMarker)[];
  disabled: boolean;
  highlight: boolean;
  onPick: (color: TileColor) => void;
}

export function CenterPool({ center, disabled, highlight, onPick }: CenterPoolProps) {
  const [hovered, setHovered] = useState<TileColor | null>(null);
  const hasMarker = center.includes(FIRST_PLAYER_MARKER);
  const stacks = TILE_COLORS.map((color) => ({ color, count: center.filter((t) => t === color).length })).filter(
    (s) => s.count > 0,
  );
  const active = !disabled && hovered && stacks.some((s) => s.color === hovered) ? hovered : null;
  const activeCount = stacks.find((s) => s.color === active)?.count ?? 0;

  return (
    <div
      className={`center-pool ${active ? 'is-hovering' : ''} ${highlight ? 'cpu-source' : ''}`}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="center-pool-label">Center</div>
      <div className="center-pool-tiles">
        {hasMarker && <MarkerTile size="sm" className={active ? 'is-grouped' : ''} />}
        {stacks.length === 0 && !hasMarker && <span className="empty-hint">empty</span>}
        {stacks.map(({ color, count }) => (
          <div
            key={color}
            className={`center-stack ${disabled ? '' : 'is-pickable'} ${active === color ? 'is-grouped' : ''}`}
            {...(disabled ? {} : pressable(() => onPick(color)))}
            aria-label={`Take ${count} ${TILE_COLOR_LABEL[color]}${hasMarker ? ' and the first player marker' : ''}`}
            onMouseEnter={() => setHovered(color)}
            onFocus={() => setHovered(color)}
            onBlur={() => setHovered(null)}
          >
            {Array.from({ length: count }).map((_, i) => (
              <Tile key={i} color={color} size="sm" style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        ))}
      </div>
      {active && (
        <span className="take-badge">
          Take {activeCount}
          {hasMarker ? ' + first-player marker' : ''}
        </span>
      )}
    </div>
  );
}
