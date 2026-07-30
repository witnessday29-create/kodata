"use client";

import { useState } from "react";
import { wages as d, num } from "@/lib/works";

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
      <p className="mach-out">
        A household of <b>{people}</b> in {prov} with <b>{earners}</b> earning the minimum wage lives
        on{" "}
        <b className="mach-rr">{rp(perPerson)}</b> per person per month — that is{" "}
        <b>{ratio.toFixed(2)}×</b> the poverty line where they are.
      </p>
      {below === 1 && (
        <p className="mach-flag warn">
          below the line, by the arithmetic of the law that set the wage
        </p>
      )}
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
            aria-label="People in the household"
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
            aria-label="Earners in the household"
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
