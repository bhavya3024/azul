import type { CSSProperties } from 'react';
import { TILE_COLOR_HEX, TILE_COLOR_LABEL } from '../game/constants';
import type { TileColor } from '../game/types';

export type TileSize = 'sm' | 'md' | 'lg';

interface TileProps {
  color: TileColor;
  size?: TileSize;
  className?: string;
  style?: CSSProperties;
  label?: string;
  /** Render as a button. Kept stable across enabled/disabled so tiles don't remount and replay their animation. */
  asButton?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function Tile({
  color,
  size = 'lg',
  className = '',
  style,
  label,
  asButton = false,
  disabled = false,
  onClick,
  ...handlers
}: TileProps) {
  const shared = {
    className: `tile tile-${size} ${className}`,
    style: { '--tile-color': TILE_COLOR_HEX[color], ...style } as CSSProperties,
    title: label ?? TILE_COLOR_LABEL[color],
    ...handlers,
  };

  if (asButton) {
    return (
      <button
        type="button"
        {...shared}
        aria-label={label ?? TILE_COLOR_LABEL[color]}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : onClick}
      />
    );
  }
  return <div {...shared} />;
}

export function Slot({ size = 'lg', className = '' }: { size?: TileSize; className?: string }) {
  return <div className={`slot tile-${size} ${className}`} />;
}

export function MarkerTile({ size = 'lg', className = '' }: { size?: TileSize; className?: string }) {
  return (
    <div className={`tile marker-tile tile-${size} ${className}`} title="First player marker">
      1
    </div>
  );
}
