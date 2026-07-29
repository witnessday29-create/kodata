"use client";

import { useMemo, useState } from "react";
import { works, num, sign } from "@/lib/works";

const w = works["01-ai-exposure"];

/**
 * Your own job, in the same two orderings.
 *
 * The piece argues that one occupation is read very differently depending on
 * which of the dataset's two measures you trust. That is easy to assert and
 * hard to feel — until it is your own job in the box. All 271 rows ship in
 * data.json; nothing is computed here, the list is only filtered.
 */
export function Finder() {
  const [q, setQ] = useState("");
  const all = w.occupations;

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return all.filter((o) => o.t.toLowerCase().includes(s)).slice(0, 8);
  }, [q, all]);

  return (
    <div className="mach">
      <label className="find">
        <span>Find an occupation — all {num(all.length)} are here</span>
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

      <p className="mach-fine">
        <b>predicted</b> is where the occupation ranks when its exposure is built up from the{" "}
        {w.abilities.length} abilities it demands; <b>rated</b> is where the dataset puts it when
        judging the occupation whole; <b>moves</b> is the distance between those two positions, out
        of {num(w.source.occupations)}. A large positive number means the dataset treats the job as
        far more exposed than its own parts imply. Writing moves{" "}
        {sign(w.robustness.subject.move, 0)} places, the largest displacement in the file.
      </p>
    </div>
  );
}
