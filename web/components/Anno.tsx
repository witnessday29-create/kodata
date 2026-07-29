/**
 * The epistemic marker, now with somewhere to go.
 *
 * Anything wrapped in <Anno> came out of the pipeline. It used to only be able
 * to *say* so; carrying `pane` it can open the evidence in the next column, so
 * the reader checks the number without leaving the sentence it sits in. `src`
 * still names the field it came from, for the cases with no pane to open.
 */
export function Anno({
  src,
  pane,
  children,
}: {
  src: string;
  pane?: string;
  children: React.ReactNode;
}) {
  if (!pane) {
    return (
      <span className="d" data-src={src}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" className="d d-go" data-src={src} data-pane={pane}>
      {children}
    </button>
  );
}
