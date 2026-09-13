import type { CSSProperties } from 'react';
import { TILE_COLOR_HEX, TILE_COLORS } from '../game/constants';
import type { PlayerBoard } from '../game/types';

interface GameOverModalProps {
  players: PlayerBoard[];
  winner: number[];
  onRestart: () => void;
}

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 20) / 10,
  duration: 2.6 + ((i * 29) % 15) / 10,
  color: TILE_COLOR_HEX[TILE_COLORS[i % TILE_COLORS.length]],
}));

export function GameOverModal({ players, winner, onRestart }: GameOverModalProps) {
  const ranked = players.map((p, i) => ({ ...p, index: i })).sort((a, b) => b.score - a.score);
  const winnerNames = winner.map((i) => players[i].name).join(' & ');
  const humanWon = winner.some((i) => !players[i].isCPU);

  return (
    <div className="modal-overlay delayed">
      {humanWon && (
        <div className="confetti" aria-hidden>
          {CONFETTI.map((piece, i) => (
            <span
              key={i}
              style={
                {
                  left: `${piece.left}%`,
                  background: piece.color,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
        <h2 id="gameover-title">Game Over</h2>
        <p className="winner-line">{winner.length > 1 ? `Tie between ${winnerNames}!` : `${winnerNames} wins!`}</p>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, rank) => (
              <tr key={p.index} className={winner.includes(p.index) ? 'winner-row' : ''}>
                <td>{rank + 1}</td>
                <td>{p.name}</td>
                <td>{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="primary-button" onClick={onRestart} autoFocus>
          New Game
        </button>
      </div>
    </div>
  );
}
