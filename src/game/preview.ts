import { FLOOR_PENALTIES, WALL_PATTERN } from './constants';
import { scoreTilePlacement } from './engine';
import type { PlayerBoard, TileColor } from './types';

export type PlacementTarget = number | 'floor';

export interface PlacementPreview {
  lineTiles: number;
  /** Includes the first-player marker when it is being taken. */
  floorTiles: number;
  completesLine: boolean;
  /** Wall points if the line completes, based on the wall as it is now. */
  linePoints: number;
  floorPenalty: number;
}

export function previewPlacement(
  player: PlayerBoard,
  color: TileColor,
  count: number,
  marker: boolean,
  target: PlacementTarget,
): PlacementPreview {
  let lineTiles = 0;
  let completesLine = false;
  let linePoints = 0;

  if (target !== 'floor') {
    const empty = player.patternLines[target].filter((t) => t === null).length;
    lineTiles = Math.min(empty, count);
    completesLine = lineTiles === empty;
    if (completesLine) {
      const col = WALL_PATTERN[target].indexOf(color);
      const wall = player.wall.map((row) => [...row]);
      wall[target][col] = color;
      linePoints = scoreTilePlacement(wall, target, col);
    }
  }

  const floorTiles = count - lineTiles + (marker ? 1 : 0);
  let floorPenalty = 0;
  for (let i = 0; i < floorTiles; i++) floorPenalty += FLOOR_PENALTIES[player.floor.length + i] ?? 0;

  return { lineTiles, floorTiles, completesLine, linePoints, floorPenalty };
}
