import type { RoundSummaryEntry } from '../game/types';

interface RoundSummaryModalProps {
  summary: RoundSummaryEntry[];
  roundNumber: number;
  onContinue: () => void;
}

export function RoundSummaryModal({ summary, roundNumber, onContinue }: RoundSummaryModalProps) {
  return (
    <div className="modal-overlay delayed">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="round-title">
        <h2 id="round-title">End of Round {roundNumber - 1}</h2>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Wall</th>
              <th>Floor</th>
              <th>Round</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((entry) => (
              <tr key={entry.player}>
                <td>{entry.player}</td>
                <td className="positive">+{entry.wallPoints}</td>
                <td className="negative">{entry.floorPenalty}</td>
                <td>
                  <strong>
                    {entry.wallPoints + entry.floorPenalty >= 0 ? '+' : ''}
                    {entry.wallPoints + entry.floorPenalty}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="primary-button" onClick={onContinue} autoFocus>
          Continue to Round {roundNumber}
        </button>
      </div>
    </div>
  );
}
