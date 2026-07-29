import { audit } from "@/lib/works";

/**
 * The notebook, rendered inside the site it audits.
 *
 * `analysis/notebooks/audit.ipynb` cannot be served by a static export, and
 * linking to GitHub would only work while the repo is public — so the pane used
 * to describe an artefact the reader had no way to reach. The generator now
 * emits the cells in render-ready form and this displays them.
 *
 * Every output block below is what the cell actually printed when
 * make_audit.py executed it. None of it is transcribed by hand.
 */

/** Minimal inline formatting — the markdown in this notebook is ours, so this
 *  handles exactly what it uses and nothing more. */
function inline(s: string, key: number) {
  const parts: React.ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\([^)]+\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1]) parts.push(<code key={i++}>{m[1]}</code>);
    else if (m[2]) parts.push(<b key={i++}>{m[2]}</b>);
    else if (m[3]) parts.push(<em key={i++}>{m[3]}</em>);
    // a link in the notebook points at a repo path, which means nothing here —
    // keep the words, drop the target
    else if (m[4]) parts.push(m[4]);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return <span key={key}>{parts}</span>;
}

function Markdown({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const blocks = text.split(/\n{2,}/);

  blocks.forEach((b, i) => {
    const t = b.trim();
    if (!t) return;
    if (t === "---") {
      out.push(<hr className="nb-rule" key={i} />);
      return;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(t);
    if (h) {
      const level = h[1].length;
      out.push(
        <p className={"nb-h nb-h" + level} key={i}>
          {inline(h[2], i)}
        </p>
      );
      return;
    }
    out.push(
      <p className="nb-p" key={i}>
        {inline(t.replace(/\n/g, " "), i)}
      </p>
    );
  });

  return <>{out}</>;
}

export function Notebook() {
  return (
    <div className="nb">
      {audit.cells.map((c, i) =>
        c.kind === "md" ? (
          <div className="nb-md" key={i}>
            <Markdown text={c.text} />
          </div>
        ) : (
          <div className="nb-cell" key={i}>
            <pre className="code nb-in">{c.text}</pre>
            {c.out ? <pre className="nb-out">{c.out}</pre> : null}
          </div>
        )
      )}
    </div>
  );
}
