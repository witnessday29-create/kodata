import type { ReactNode } from "react";

/**
 * The second mode, in place rather than behind a switch.
 *
 * A global plain/advance toggle would mean writing every analytical sentence
 * twice and keeping the two versions honest with each other forever. This puts
 * the technical layer directly under the claim it belongs to: plain prose is
 * the default, and the reader who wants the method, the intervals, and the
 * objections opens them without leaving the paragraph.
 *
 * Native <details>, so it works with no JavaScript, is keyboard-operable, and
 * is found by in-page search even while collapsed.
 */
export function Expert({
  title = "method, robustness, and objections",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <details className="xp">
      <summary>
        <span className="xp-k">advance</span>
        <span className="xp-t">{title}</span>
        <span className="xp-sign" aria-hidden />
      </summary>
      <div className="xp-body">{children}</div>
    </details>
  );
}

/** A 95% interval, set so it can never be mistaken for the point estimate. */
export function CI({ lo, hi, of }: { lo: number; hi: number; of?: string }) {
  const f = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(v < 1 ? 4 : 2);
  return (
    <span className="ci">
      95% CI {of ? <em>{of}</em> : null} [{f(lo)}, {f(hi)}]
    </span>
  );
}

/** A ratio's interval, which is multiplicative and so never gets a sign. */
export function RatioCI({ lo, hi }: { lo: number | null; hi: number | null }) {
  if (lo == null || hi == null) return null;
  const crosses = lo <= 1;
  return (
    <span className={"ci" + (crosses ? " ci-weak" : "")}>
      95% CI [{lo.toFixed(2)}×, {hi.toFixed(2)}×]
      {crosses && " — includes 1"}
    </span>
  );
}

/** A row inside an expert block: the claim, then what would break it. */
export function Check({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="xp-row">
      <span className="xp-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}
