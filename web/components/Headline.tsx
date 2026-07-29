"use client";

import { useState } from "react";
import { screenTime as d, num } from "@/lib/works";
import { RatioCI } from "./Expert";

/**
 * The headline machine.
 *
 * Two lines have to be drawn before "heavy screen users are N times more likely
 * to be depressed" can be written: one on the questionnaire, one on screen use.
 * Published claims almost never report either. Move both and the same 4,810
 * teenagers yield any risk ratio between about 1.1 and 3.0 — every one of them
 * arithmetically true.
 *
 * Nothing here is computed in the browser. All 130 cells were computed by
 * analysis/pipelines/02_screen_time/build.py and committed to data.json; the
 * sliders only index into that array. That is what keeps every figure on screen
 * traceable to a source file, which is the rule the whole site rests on.
 */
export function Headline() {
  const g = d.grid;
  const [ci, setCi] = useState(g.cutoffs.indexOf(g.default_cutoff));
  const [ti, setTi] = useState(g.thresholds.indexOf(g.default_threshold));

  const cutoff = g.cutoffs[ci];
  const band = g.cells[ti];
  const cell = band.row[ci];
  const hours = g.hours_at[String(band.threshold) as keyof typeof g.hours_at];

  const isDefault = cutoff === g.default_cutoff && band.threshold === g.default_threshold;
  // A point estimate whose interval includes 1 is not distinguishable from no
  // difference at all — and nothing in a published sentence would say so. That
  // is the strongest version of this piece's argument, so it is never hidden.
  const weak = !cell.solid;

  const rrs = g.cells.flatMap((b) => b.row.map((c) => c.rr ?? 0));
  const lo = Math.min(...rrs);
  const hi = Math.max(...rrs);

  return (
    <div className="mach">
      <p className="mach-out">
        Teenagers with more than about <b>{hours} hours</b> of leisure screen time a day are{" "}
        <b className="mach-rr">{cell.rr?.toFixed(2)}×</b> more likely to be depressed.
      </p>
      <p className="mach-fine">
        …where <em>“more than about {hours} hours”</em> means a screen-time index of{" "}
        {band.threshold} or more ({num(band.n_heavy)} of {num(d.source.subjects)} teenagers), and{" "}
        <em>“depressed”</em> means a questionnaire total of {cutoff} or more —{" "}
        {num(cell.nh_flagged)} heavy users and {num(cell.nl_flagged)} others.{" "}
        {cell.ph.toFixed(1)}% versus {cell.pl.toFixed(1)}%.{" "}
        <RatioCI lo={cell.ci[0]} hi={cell.ci[1]} />
      </p>

      <div className="mach-ctl">
        <label>
          <span>
            “depressed” means a total of <b>{cutoff}</b> or more
            {cutoff === d.headline.cutoff_in_file && <i> ← the line in the source file</i>}
          </span>
          <input
            type="range"
            min={0}
            max={g.cutoffs.length - 1}
            value={ci}
            onChange={(e) => setCi(+e.target.value)}
            aria-label="Depression cutoff"
          />
          <span className="mach-ends">
            <span>{g.cutoffs[0]}</span>
            <span>{g.cutoffs[g.cutoffs.length - 1]}</span>
          </span>
        </label>

        <label>
          <span>
            “heavy user” means an index of <b>{band.threshold}</b> or more
            <i> ≈ {hours} h/day</i>
          </span>
          <input
            type="range"
            min={0}
            max={g.thresholds.length - 1}
            value={ti}
            onChange={(e) => setTi(+e.target.value)}
            aria-label="Heavy-user threshold"
          />
          <span className="mach-ends">
            <span>{g.thresholds[0]}</span>
            <span>{g.thresholds[g.thresholds.length - 1]}</span>
          </span>
        </label>
      </div>

      {weak ? (
        <p className="mach-flag warn">
          This one is not distinguishable from no difference at all: its interval includes 1. It
          rests on {num(cell.nh_flagged)} flagged heavy users. The point estimate is still{" "}
          {cell.rr?.toFixed(2)}×, still arithmetically correct, and still perfectly quotable —
          nothing in a published sentence would tell you it could just as easily be nothing.
        </p>
      ) : isDefault ? (
        <p className="mach-flag">
          These are the two lines the source file itself draws. Every other position below is
          equally available to anyone reporting this dataset.
        </p>
      ) : null}

      <div className="mach-grid" role="group" aria-label="All 130 available headlines">
        {g.cells.map((b, bi) => (
          <div className="mach-band" key={b.threshold}>
            <span className="mach-band-k">≥{b.threshold}</span>
            {b.row.map((c, k) => {
              const t = ((c.rr ?? lo) - lo) / (hi - lo);
              return (
                <button
                  key={k}
                  type="button"
                  className={
                    "mach-cell" +
                    (bi === ti && k === ci ? " on" : "") +
                    (c.solid ? "" : " weak")
                  }
                  style={{ opacity: 0.16 + t * 0.84 }}
                  onClick={() => {
                    setTi(bi);
                    setCi(k);
                  }}
                  title={`cutoff ${g.cutoffs[k]}, index ≥${b.threshold} → ${c.rr}×`}
                  aria-label={`Cutoff ${g.cutoffs[k]}, index ${b.threshold} or more, ratio ${c.rr}`}
                />
              );
            })}
          </div>
        ))}
        <span className="mach-axis">
          <span>cutoff {g.cutoffs[0]}</span>
          <span>
            {rrs.length} true headlines, {lo.toFixed(2)}× to {hi.toFixed(2)}× · hatched ={" "}
            {d.robustness.grid_cells - d.robustness.grid_solid} whose interval includes 1
          </span>
          <span>{g.cutoffs[g.cutoffs.length - 1]}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * The other half of the finding: there is no symptom to point at.
 *
 * Strip out the items most associated with screen time, rebuild the total from
 * what is left, and the correlation barely moves — because the association is
 * spread almost evenly across all 21 items rather than sitting in any of them.
 * Again, every value is precomputed; the slider only chooses which row to show.
 */
export function Flatness() {
  const [k, setK] = useState(0);
  const s = d.drop_series[k];
  const base = d.drop_series[0].r;
  const fl = d.item_flatness;

  const max = Math.max(...d.items.map((i) => i.r));

  return (
    <div className="mach">
      <div className="flat">
        {d.items.map((it) => (
          <span className="flat-i" key={it.item} title={`item ${it.item}: r = ${it.r}`}>
            <i style={{ height: `${(it.r / max) * 100}%` }} />
            <span>{String(it.item).padStart(2, "0")}</span>
          </span>
        ))}
      </div>
      <p className="tile-cap">
        Correlation between screen time and each of the {d.source.items} questionnaire items
        separately. Mean <b>{fl.mean.toFixed(4)}</b>, standard deviation only{" "}
        <b>{fl.sd.toFixed(4)}</b> — {fl.inner_n} of {d.source.items} sit between{" "}
        <b>{fl.inner_lo.toFixed(4)}</b> and <b>{fl.inner_hi.toFixed(4)}</b>. The source file ships
        the items unlabelled, so they are shown by number.
      </p>

      <div className="mach-ctl">
        <label>
          <span>
            remove the <b>{s.dropped}</b> items most associated with screen time, keep{" "}
            <b>{s.kept}</b>
          </span>
          <input
            type="range"
            min={0}
            max={d.drop_series.length - 1}
            value={k}
            onChange={(e) => setK(+e.target.value)}
            aria-label="Items removed"
          />
          <span className="mach-ends">
            <span>0</span>
            <span>{d.drop_series[d.drop_series.length - 1].dropped}</span>
          </span>
        </label>
      </div>

      <p className="mach-out sm">
        Rebuilt from the remaining {s.kept} items, the score still correlates with screen time at{" "}
        <b className="mach-rr">{s.r >= 0 ? "+" : "−"}{Math.abs(s.r).toFixed(4)}</b>
        {k > 0 && (
          <>
            {" "}
            — down from {base >= 0 ? "+" : "−"}
            {Math.abs(base).toFixed(4)}, after throwing away {s.dropped} of {d.source.items}{" "}
            symptoms.
          </>
        )}
      </p>
      <p className="mach-fine">
        You cannot take the finding apart by removing symptoms, because it does not sit in any of
        them. Note what this does <em>not</em> establish: sleep quality, which explains eight times
        as much and has an obvious mechanism, loads just as evenly across these{" "}
        {d.source.items} items. So an even spread says something about the questionnaire, not about
        screens. What it does establish is narrower and still worth having — there is no symptom
        here for anyone to point at.
      </p>
    </div>
  );
}
