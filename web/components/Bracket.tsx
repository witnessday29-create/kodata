/**
 * Bracketed label with a per-letter roll on hover.
 *
 * The visible letters are split into two stacked copies to animate, which turns
 * the accessible name into nonsense — so the split copy is hidden from
 * assistive tech and the real word is carried once, invisibly, beside it.
 *
 * Presentational only: the caller decides whether it is a link, a button, or a
 * pane trigger, so the same mark can do all three without a variant prop.
 */
export function Bracket({ children }: { children: string }) {
  return (
    <span className="brk">
      <span className="sr">{children}</span>
      <span className="brk-vis" aria-hidden>
        <i>[</i>
        <span className="brk-w">
          {[...children].map((ch, k) => (
            <span className="brk-l" key={k} style={{ ["--k" as string]: k }}>
              <span>{ch}</span>
              <span>{ch}</span>
            </span>
          ))}
        </span>
        <i>]</i>
      </span>
    </span>
  );
}
