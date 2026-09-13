import { useState, type CSSProperties } from 'react';
import { TILE_COLOR_LABEL } from '../game/constants';
import type { Factory, TileColor } from '../game/types';
import { Slot, Tile } from './Tile';

interface FactoryDisplayProps {
  factory: Factory;
  round: number;
  disabled: boolean;
  highlight: boolean;
  onPick: (color: TileColor) => void;
}

export function FactoryDisplay({ factory, round, disabled, highlight, onPick }: FactoryDisplayProps) {
  const [hovered, setHovered] = useState<TileColor | null>(null);
  const active = !disabled && hovered && factory.tiles.includes(hovered) ? hovered : null;
  const countOf = (color: TileColor) => factory.tiles.filter((t) => t === color).length;

  const classes = [
    'factory',
    factory.tiles.length === 0 && 'factory-empty',
    active && 'factory-hovered',
    highlight && 'cpu-source',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onMouseLeave={() => setHovered(null)}>
      <div className="factory-grid">
        {[0, 1, 2, 3].map((i) => {
          const color = factory.tiles[i];
          if (!color) return <Slot key={`slot-${i}`} size="md" />;
          const grouping = active ? (color === active ? 'is-grouped' : 'is-dimmed') : '';
          return (
            <Tile
              key={`r${round}-${i}`}
              asButton
              disabled={disabled}
              color={color}
              size="md"
              className={`${disabled ? '' : 'is-pickable'} ${grouping}`}
              style={{ '--i': factory.id + i } as CSSProperties}
              label={`Take ${countOf(color)} ${TILE_COLOR_LABEL[color]}`}
              onClick={() => onPick(color)}
              onMouseEnter={() => setHovered(color)}
              onFocus={() => setHovered(color)}
              onBlur={() => setHovered(null)}
            />
          );
        })}
      </div>
      {active && <span className="take-badge">Take {countOf(active)}</span>}
    </div>
  );
}
