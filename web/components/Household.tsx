"use client";

import { useEffect, useRef, useState } from "react";
import { wages as d, num } from "@/lib/works";
import { ShareLink } from "./ShareLink";
import { readParam, writeParams } from "@/lib/urlState";

/**
 * The formula, operated by hand.
 *
 * PP 36/2021 sets the Indonesian minimum wage from average consumption per head
 * times average household size, divided by the average number of household
 * members who work. So a reader moving those levers is not applying an outside
 * standard to Indonesian wage policy — they are running the policy's own
 * arithmetic and watching where it lands.
 *
 * Nothing here is computed in the browser. All 2,376 cells were computed by
 * analysis/pipelines/03_pekerja_sejahtera/build.py and committed to data.json;
 * the controls only index into that array. That is the rule the whole site
 * rests on, and it is why area is a lever rather than a division: the poverty
 * line is lower in a village, so the same wage clears it more easily there
 * without anybody being better off.
 */
export function Household() {
  const m = d.machine;
  const [prov, setProv] = useState(m.default.province);
  const [area, setArea] = useState(m.default.area);
  const [size, setSize] = useState(m.sizes.indexOf(m.default.size));
  const [earn, setEarn] = useState(m.earners.indexOf(m.default.earners));

  // A household a reader assembled is the whole point of this piece being
  // interactive — so it has to survive a reload, not just a scroll position.
  // Read after mount rather than in useState, so the first paint still matches
  // the statically exported default and hydration does not warn.
  useEffect(() => {
    const p = readParam("prov");
    if (p && m.provinces.includes(p)) setProv(p);
    const a = Number(readParam("area"));
    if (Number.isInteger(a) && a >= 0 && a < m.area_labels.length) setArea(a);
    const s = Number(readParam("size"));
    if (Number.isInteger(s) && s >= 0 && s < m.sizes.length) setSize(s);
    const e = Number(readParam("earn"));
    if (Number.isInteger(e) && e >= 0 && e < m.earners.length) setEarn(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Skip the write on the very first run: nothing has changed yet, and
  // calling replaceState the instant the page mounts — right as a reader is
  // likely already swiping to scroll — is exactly the kind of history-API
  // call that can jog an in-progress touch gesture on some mobile browsers.
  const wroteOnce = useRef(false);
  useEffect(() => {
    if (!wroteOnce.current) {
      wroteOnce.current = true;
      return;
    }
    writeParams({ prov, area: String(area), size: String(size), earn: String(earn) });
  }, [prov, area, size, earn]);

  const cells = m.cells as Record<string, number[][][][]>;
  const ump = (m.ump as Record<string, number>)[prov];
  const line = (m.gk as Record<string, number[]>)[prov][area];
  const [perPerson, ratio, below] = cells[prov][area][earn][size];

  const people = m.sizes[size];
  const earners = m.earners[earn];
  const belowHere = (m.below_count as Record<string, number[]>)[prov][area];

  const rp = (n: number) => "Rp " + num(n);

  return (
    <div className="mach">
      <p className="mach-out" aria-live="polite">
        A household of <b>{people}</b> in {prov} with <b>{earners}</b> earning the minimum wage lives
        on{" "}
        <b className="mach-rr">{rp(perPerson)}</b> per person per month — that is{" "}
        <b>{ratio.toFixed(2)}×</b> the poverty line where they are.
      </p>
      {below === 1 && (
        <p className="mach-flag warn" aria-live="polite">
          below the line, by the arithmetic of the law that set the wage
        </p>
      )}
      <ShareLink label="copy this household's link" />
      <p className="mach-fine">
        …where the wage is {prov}&rsquo;s legal minimum for {m.year}, {rp(ump)} a month, and{" "}
        <em>the poverty line</em> is {rp(line)} per person per month for{" "}
        {m.area_labels[area]}. Of the {m.combinations} household shapes available here,{" "}
        <b>{belowHere}</b> fall below the line.
      </p>

      <div className="who">
        <span>the line for</span>
        {m.area_labels.map((label, i) => (
          <button
            key={label}
            type="button"
            className={area === i ? "on" : undefined}
            onClick={() => setArea(i)}
            aria-pressed={area === i}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mach-ctl">
        <label>
          <span>
            people in the household: <b>{people}</b>
            {people === m.default.size && <i> ← close to the national average</i>}
          </span>
          <input
            type="range"
            min={0}
            max={m.sizes.length - 1}
            value={size}
            onChange={(e) => setSize(+e.target.value)}
            aria-valuetext={String(people)}
          />
          <span className="mach-ends">
            <span>{m.sizes[0]}</span>
            <span>{m.sizes[m.sizes.length - 1]}</span>
          </span>
        </label>

        <label>
          <span>
            of them, earning a minimum wage: <b>{earners}</b>
            <i> {earners === 1 ? " — the assumption in every headline" : ""}</i>
          </span>
          <input
            type="range"
            min={0}
            max={m.earners.length - 1}
            value={earn}
            onChange={(e) => setEarn(+e.target.value)}
            aria-valuetext={String(earners)}
          />
          <span className="mach-ends">
            <span>{m.earners[0]}</span>
            <span>{m.earners[m.earners.length - 1]}</span>
          </span>
        </label>

        <label>
          <span>
            province: <b>{prov}</b>
          </span>
          {/* a select rather than a slider: 33 provinces have no order to slide
              along, and alphabetical would imply one */}
          <select
            value={prov}
            onChange={(e) => setProv(e.target.value)}
            aria-label="Province"
            className="mach-sel"
          >
            {m.provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mach-fine" style={{ marginTop: "1rem" }}>
        {m.excluded.join(", ")} {m.excluded_why}, so it has no row here. Every cell above was
        computed in Python and committed before this page was built; the controls index an array and
        divide nothing.
      </p>
    </div>
  );
}
