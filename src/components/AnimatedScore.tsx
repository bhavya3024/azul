import { useEffect, useRef, useState } from 'react';

const DURATION = 700;

export function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [delta, setDelta] = useState<{ amount: number; id: number } | null>(null);
  const shown = useRef(value);

  useEffect(() => {
    const from = shown.current;
    if (from === value) return;
    setDelta({ amount: value - from, id: performance.now() });

    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / DURATION);
      const current = Math.round(from + (value - from) * (1 - (1 - t) ** 3));
      shown.current = current;
      setDisplay(current);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className="player-score">
      {display} pts
      {delta && (
        <span key={delta.id} className={`score-delta ${delta.amount > 0 ? 'up' : 'down'}`} aria-hidden>
          {delta.amount > 0 ? '+' : '−'}
          {Math.abs(delta.amount)}
        </span>
      )}
    </span>
  );
}
