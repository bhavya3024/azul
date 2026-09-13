import { useState, type CSSProperties } from 'react';
import { TILE_COLORS } from '../game/constants';
import { loadPlayerName, savePlayerName } from '../game/storage';
import type { PlayerSetup } from '../game/types';
import { Tile } from './Tile';

interface SetupScreenProps {
  onStart: (players: PlayerSetup[]) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [name, setName] = useState(loadPlayerName);

  const handleStart = () => {
    const finalName = name.trim() || 'You';
    savePlayerName(finalName);
    onStart([
      { name: finalName, isCPU: false },
      { name: 'CPU', isCPU: true },
    ]);
  };

  return (
    <div className="setup-screen">
      <div className="logo-tiles" aria-hidden>
        {TILE_COLORS.map((color, i) => (
          <Tile key={color} color={color} size="lg" style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
      <h1>Azul</h1>
      <p className="subtitle">Draft tiles, build your wall, outscore the CPU.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleStart();
        }}
      >
        <div className="setup-field">
          <label htmlFor="player-name">Your name</label>
          <input id="player-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="You" />
        </div>
        <button type="submit" className="primary-button">
          Play vs CPU
        </button>
      </form>

      <ul className="how-to">
        <li>Take every tile of one color from a factory or the center.</li>
        <li>Fill pattern lines — full lines move to your wall at the end of the round.</li>
        <li>Wall tiles next to each other score more. Extra tiles fall to the floor and cost points.</li>
      </ul>
    </div>
  );
}
