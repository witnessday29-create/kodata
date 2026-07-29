import type { ReactNode } from "react";

export type FileSpec = {
  /** the file as the source ships it */
  name: string;
  rows: string;
  cols: string;
  /** what one row of it actually is */
  unit: string;
  /** the columns this piece leans on */
  used: string;
};

/**
 * The front matter every piece opens with.
 *
 * A component rather than markup so both pieces are forced into the same
 * shape — the site claims the same four layers in the same order every time,
 * and a shared introduction is the cheapest way to keep that claim true.
 */
export function Intro({
  dataset,
  kaggle,
  retrieved,
  what,
  abstract,
  asks,
  files,
  caveat,
}: {
  dataset: string;
  kaggle: string;
  retrieved: string;
  /** plain-language description of what was measured, and on whom */
  what: ReactNode;
  /** the finding, before any of the working */
  abstract: ReactNode;
  /** the questions this piece actually answers, in order */
  asks: ReactNode[];
  files: FileSpec[];
  /** the one thing a reader should hold in mind throughout */
  caveat: ReactNode;
}) {
  return (
    <section className="intro">
      <p className="kicker">
        introduction <i />
      </p>

      <dl className="meta">
        <div>
          <dt>dataset</dt>
          <dd>{dataset}</dd>
        </div>
        <div>
          <dt>source</dt>
          <dd>
            <code>{kaggle}</code>
          </dd>
        </div>
        <div>
          <dt>retrieved</dt>
          <dd>{retrieved}</dd>
        </div>
      </dl>

      <h4 className="intro-h">What this data is</h4>
      <div className="intro-b">{what}</div>

      <h4 className="intro-h">Abstract</h4>
      <div className="intro-b abs">{abstract}</div>

      <h4 className="intro-h">What this piece asks</h4>
      <ol className="asks">
        {asks.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ol>

      <h4 className="intro-h">How the data is structured</h4>
      <div className="scroller">
        <table>
          <thead>
            <tr>
              <th>file</th>
              <th>rows</th>
              <th>cols</th>
              <th>one row is</th>
              <th>columns used here</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.name}>
                <td>
                  <code>{f.name}</code>
                </td>
                <td>{f.rows}</td>
                <td>{f.cols}</td>
                <td>{f.unit}</td>
                <td>{f.used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="intro-caveat">
        <span>hold this in mind</span>
        <div>{caveat}</div>
      </div>

      <p className="intro-how">
        Prose is written for anyone. Every figure set in mono opens its own
        evidence in a column to the right. Blocks marked{" "}
        <span className="xp-k inline">advance</span> hold the method, the confidence intervals, and
        the objections — open them if you want the working, skip them and the piece still reads.
      </p>
    </section>
  );
}
