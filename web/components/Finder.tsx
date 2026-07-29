"use client";

import { useMemo, useState } from "react";
import { works, num, sign } from "@/lib/works";

const w = works["01-ai-exposure"];
type Occ = (typeof w.occupations)[number];

/**
 * Your own job, in the same two orderings — and any two of them side by side.
 *
 * The piece argues that one occupation is read very differently depending on
 * which of the dataset's two measures you trust. That is easy to assert and hard
 * to feel until it is your own job in the box, and harder still to argue with
 * once two jobs are next to each other. All 271 rows ship in data.json; nothing
 * is computed here, the list is only filtered.
 */
export function Finder() {
  const [q, setQ] = useState("");
  const [pinned, setPinned] = useState<Occ[]>([]);
  const all = w.occupations;

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return all.filter((o) => o.t.toLowerCase().includes(s)).slice(0, 8);
  }, [q, all]);

  const pin = (o: Occ) =>
    setPinned((cur) =>
      cur.some((x) => x.soc === o.soc)
        ? cur.filter((x) => x.soc !== o.soc)
        : // two is the comparison; a third would be a table, which is the next pane along
          [...cur, o].slice(-2)
    );

  const isPinned = (o: Occ) => pinned.some((x) => x.soc === o.soc);

  return (
    <div className="mach">
      <label className="find">
        <span>
          Find an occupation — all {num(all.length)} are here. Pick two to compare them.
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="nurse, teacher, mechanic, lawyer…"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {q.trim() && hits.length === 0 && (
        <p className="mach-fine" style={{ borderTop: 0, paddingTop: 0 }}>
          No occupation in this dataset matches “{q.trim()}”. It covers{" "}
          {num(w.source.occupations)} titles as the Bureau of Labor Statistics groups them, so many
          real jobs sit inside a broader heading than the one you would use for yourself.
        </p>
      )}

      {hits.length > 0 && (
        <div className="scroller" style={{ marginBottom: 0 }}>
          <table>
            <thead>
              <tr>
                <th />
                <th>occupation</th>
                <th>predicted</th>
                <th>rated</th>
                <th>moves</th>
                <th>exposure</th>
                <th>wage</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((o) => (
                <tr key={o.soc} className={o.t === w.subject.title ? "hit" : undefined}>
                  <td>
                    <button
                      type="button"
                      className={"pin" + (isPinned(o) ? " on" : "")}
                      onClick={() => pin(o)}
                      aria-pressed={isPinned(o)}
                      aria-label={`Compare ${o.t}`}
                      title="Compare"
                    >
                      {isPinned(o) ? "✓" : "+"}
                    </button>
                  </td>
                  <td>{o.t}</td>
                  <td>{o.pr}</td>
                  <td>{o.ar}</td>
                  <td className={o.mv > 0 ? "up" : o.mv < 0 ? "down" : undefined}>
                    {o.mv > 0 ? "+" : ""}
                    {o.mv}
                  </td>
                  <td>{o.e.toFixed(3)}</td>
                  <td>${num(o.w)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pinned.length > 0 && (
        <div className="vs">
          {pinned.map((o) => (
            <div className="vs-col" key={o.soc}>
              <span className="vs-t">{o.t}</span>
              <dl>
                {(
                  [
                    ["predicted rank", String(o.pr), o.pr / w.source.occupations],
                    ["rated rank", String(o.ar), o.ar / w.source.occupations],
                    [
                      "displacement",
                      `${o.mv > 0 ? "+" : ""}${o.mv}`,
                      Math.abs(o.mv) / w.source.occupations,
                    ],
                    ["exposure", o.e.toFixed(3), o.e / 0.9],
                    ["median wage", `$${num(o.w)}`, o.w / 250000],
                    ["growth to 2034", `${o.g > 0 ? "+" : ""}${o.g}%`, Math.abs(o.g) / 40],
                  ] as const
                ).map(([k, v, frac]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                    <span className="vs-bar">
                      <i style={{ width: `${Math.min(100, Math.max(2, frac * 100))}%` }} />
                    </span>
                  </div>
                ))}
              </dl>
              <button type="button" className="vs-x" onClick={() => pin(o)}>
                remove
              </button>
            </div>
          ))}
          {pinned.length === 1 && (
            <div className="vs-col vs-empty">
              <span className="vs-t">pick a second</span>
              <p>
                Search again and press <b>+</b>. Two jobs next to each other is where the
                disagreement stops being an abstraction.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="mach-fine">
        <b>predicted</b> is where the occupation ranks when its exposure is built up from the{" "}
        {w.abilities.length} abilities it demands; <b>rated</b> is where the dataset puts it when
        judging the occupation whole; <b>moves</b> is the distance between those two positions, out
        of {num(w.source.occupations)}. A large positive number means the dataset treats the job as
        far more exposed than its own parts imply. Writing moves{" "}
        {sign(w.robustness.subject.move, 0)} places, the largest displacement in the file. Bars are
        scaled within each measure so two columns can be read against each other, not against zero.
      </p>
    </div>
  );
}
