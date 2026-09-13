import type { TileColor } from './types';

export const TILE_COLORS: TileColor[] = ['blue', 'yellow', 'red', 'black', 'cyan'];

export const TILE_COLOR_HEX: Record<TileColor, string> = {
  blue: '#2f6fed',
  yellow: '#f2b90c',
  red: '#e5484d',
  black: '#2b2b33',
  cyan: '#12b3a8',
};

export const TILE_COLOR_LABEL: Record<TileColor, string> = {
  blue: 'Blue',
  yellow: 'Yellow',
  red: 'Red',
  black: 'Black',
  cyan: 'Cyan',
};

export const TILES_PER_COLOR = 20;

export const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

export const WALL_SIZE = 5;

// Fixed Azul wall color pattern: color at [row][col]
export const WALL_PATTERN: TileColor[][] = Array.from({ length: WALL_SIZE }, (_, row) =>
  Array.from({ length: WALL_SIZE }, (_, col) => TILE_COLORS[(col - row + WALL_SIZE) % WALL_SIZE]),
);

export function factoryCountForPlayers(numPlayers: number): number {
  return numPlayers * 2 + 1;
}
