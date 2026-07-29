type Row = { ability: string; ability_exposure: number; percentile: number };

/** 21 abilities, sorted by exposure. Zero line included because one bar crosses it. */
export function AbilityBars({ rows }: { rows: Row[] }) {
  const sorted = [...rows].sort((a, b) => b.ability_exposure - a.ability_exposure);
  const lo = Math.min(...sorted.map((r) => r.ability_exposure), 0);
  const hi = Math.max(...sorted.map((r) => r.ability_exposure));
  const span = hi - lo;
  const zero = (-lo / span) * 100;

  return (
    <div className="scroller">
      <div className="bars">
        {sorted.map((r) => {
          const neg = r.ability_exposure < 0;
          const w = (Math.abs(r.ability_exposure) / span) * 100;
          const cls =
            "bar-row" +
            (neg ? " neg" : "") +
            (r.percentile >= 90 ? " strong" : "") +
            (r.ability_exposure >= 1 ? " hi" : "");
          return (
            <div className={cls} key={r.ability}>
              <span className="bar-name">{r.ability}</span>
              <span className="bar-track">
                <span className="bar-zero" style={{ left: `${zero}%` }} />
                <span
                  className="bar-fill"
                  style={{ left: `${neg ? zero - w : zero}%`, width: `${w}%` }}
                />
              </span>
              <span className="bar-pct">
                {r.percentile.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
