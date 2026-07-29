"""02 — Screen time vs mental health.

Emits web/content/02-screen-time/data.json, the single contract between this
analysis and the web layer. Nothing downstream re-computes anything.

That rule is why the interactive parts of this piece are shaped the way they
are. The reader can move two thresholds and watch the reported risk ratio
change, but the site is not computing those ratios live: every cell of the
(cutoff x screen-threshold) grid is computed here, in Python, and committed.
The slider indexes into a precomputed array. So a figure on screen is still
traceable to a source file, which is the whole promise of the site.

stdlib only: this machine's Application Control policy blocks pandas' compiled
extensions, and at n=4810 there is nothing pandas would buy us.

    python analysis/pipelines/02_screen_time/build.py
"""
import csv, json, math, statistics as st
from datetime import date
from pathlib import Path

import kagglehub

SLUG = "kylefengkfeng209/screen-time-vs-mental-health-ml-ready"
OUT = Path(__file__).resolve().parents[3] / "web" / "content" / "02-screen-time" / "data.json"

# the binary `depressed` column in the source file is exactly this line
CUTOFF_IN_FILE = 14

# the two axes the reader is allowed to move
CUTOFFS = list(range(5, 31))
THRESHOLDS = [2, 3, 4, 5, 6]


# ---------------------------------------------------------------- load

def load(base, name):
    rows = list(csv.DictReader(open(f"{base}/{name}", newline="", encoding="utf-8")))
    for r in rows:
        for k, v in r.items():
            if v in ("", None):
                r[k] = None
            else:
                try:
                    r[k] = float(v)
                except ValueError:
                    pass
    return rows


# ---------------------------------------------------------------- stats

def pearson(pairs):
    pairs = [(a, b) for a, b in pairs if a is not None and b is not None]
    x = [a for a, _ in pairs]
    y = [b for _, b in pairs]
    mx, my = st.mean(x), st.mean(y)
    num = sum((a - mx) * (b - my) for a, b in pairs)
    den = math.sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))
    return num / den if den else float("nan")


def spearman(pairs):
    """Pearson on ranks. The screen index and the questionnaire items are
    ordinal, so this is the honest companion to every Pearson below."""
    pairs = [(a, b) for a, b in pairs if a is not None and b is not None]

    def rank(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        out = [0.0] * len(v)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                out[order[k]] = avg
            i = j + 1
        return out

    return pearson(list(zip(rank([a for a, _ in pairs]), rank([b for _, b in pairs]))))


def r_ci(r, n, z=1.96):
    """Fisher z interval. Analytic, so the pipeline stays deterministic."""
    if n <= 3:
        return (float("nan"), float("nan"))
    f, se = math.atanh(r), 1 / math.sqrt(n - 3)
    return round(math.tanh(f - z * se), 4), round(math.tanh(f + z * se), 4)


def rr_ci(a, n1, c, n0, z=1.96):
    """Katz interval for a risk ratio, on the log scale.

    This is the number the piece was missing. A ratio of 2.97 resting on a
    handful of flagged teenagers has an interval wide enough to include 1 —
    and 'includes 1' is the difference between a finding and a coincidence.
    """
    if a == 0 or c == 0 or n1 == 0 or n0 == 0:
        return (None, None)
    lr = math.log((a / n1) / (c / n0))
    se = math.sqrt(1 / a - 1 / n1 + 1 / c - 1 / n0)
    return round(math.exp(lr - z * se), 3), round(math.exp(lr + z * se), 3)


def partial(rxy, rxz, rzy):
    """rxy with z held constant, from the three simple correlations."""
    return (rxy - rxz * rzy) / math.sqrt((1 - rxz ** 2) * (1 - rzy ** 2))


def main():
    base = kagglehub.dataset_download(SLUG)
    rows = load(base, "screen_time_mental_health.csv")
    items = load(base, "bdi_and_screen_items.csv")
    by_id = {r["subject_id"]: r for r in items}

    n = len(rows)
    item_keys = [f"bdi_item_{i:02d}" for i in range(1, 22)]

    # ── the line the file itself draws ────────────────────────────────────
    # The source ships a binary `depressed` column without saying what produced
    # it. Rather than assume, search every plausible cutoff and report how well
    # each one reproduces the column. Exactly one should reproduce it perfectly;
    # if that stops being true the piece is making a claim it cannot support, so
    # this asserts rather than warns.
    cutoff_check = []
    for c in CUTOFFS:
        agree = sum(1 for r in rows
                    if (1.0 if r["bdi_total"] >= c else 0.0) == r["depressed"]) / n
        cutoff_check.append({"cutoff": c, "agreement": round(agree, 4)})
    exact = [d for d in cutoff_check if d["agreement"] == 1.0]
    assert len(exact) == 1, f"expected one exact cutoff, found {[d['cutoff'] for d in exact]}"
    assert exact[0]["cutoff"] == CUTOFF_IN_FILE, (
        f"`depressed` is bdi_total >= {exact[0]['cutoff']}, not {CUTOFF_IN_FILE}")
    runner_up = max((d for d in cutoff_check if d["agreement"] < 1.0),
                    key=lambda d: d["agreement"])

    # ── the headline, and the thing nobody leads with ──────────────────────
    r_screen = pearson([(r["screen_time_index"], r["bdi_total"]) for r in rows])
    r_sleepq = pearson([(r["sleep_quality_index"], r["bdi_total"]) for r in rows])
    r_sleeph = pearson([(r["avg_sleep_hours"], r["bdi_total"]) for r in rows])

    # ── what absorbs the screen-time effect ───────────────────────────────
    partials = []
    for z in ["avg_sleep_hours", "midsleep_weekend_hours", "sleep_quality_index",
              "social_jetlag_hours"]:
        rxz = pearson([(r["screen_time_index"], r[z]) for r in rows])
        rzy = pearson([(r[z], r["bdi_total"]) for r in rows])
        p = partial(r_screen, rxz, rzy)
        partials.append({
            "control": z,
            "screen_x_control": round(rxz, 4),
            "control_x_bdi": round(rzy, 4),
            "partial": round(p, 4),
            "absorbed_pct": round(100 * (1 - abs(p) / abs(r_screen)), 1),
        })
    partials.sort(key=lambda d: -d["absorbed_pct"])

    # ── robustness ────────────────────────────────────────────────────────
    # Pearson on an ordinal index is defensible but not obviously right, so
    # every headline correlation is reported with its rank-based companion and
    # its interval. If those disagreed, the piece would have to say so.
    def both(xk, yk, sub=None):
        src = sub if sub is not None else rows
        pairs = [(r[xk], r[yk]) for r in src]
        p = pearson(pairs)
        return {
            "n": len(pairs),
            "pearson": round(p, 4),
            "ci": list(r_ci(p, len(pairs))),
            "spearman": round(spearman(pairs), 4),
            "r2_pct": round(100 * p ** 2, 1),
        }

    robustness = {
        "screen": both("screen_time_index", "bdi_total"),
        "sleep_quality": both("sleep_quality_index", "bdi_total"),
        "sleep_hours": both("avg_sleep_hours", "bdi_total"),
        # the same three, split by sex — a subgroup check the piece never claims
        # to have made unless it is actually here
        "by_sex": [
            {"sex": s, **both("screen_time_index", "bdi_total",
                              [r for r in rows if r["sex"] == s])}
            for s in ["Boy", "Girl"]
        ],
        # grid_cells / grid_solid are filled in once the grid exists, below
        # the drop-series rebuilds shorter and shorter questionnaires, so its
        # totals are not on one common scale; said here rather than left implicit
        "drop_series_caveat": "composites of differing length; r not on a common scale",
    }

    # ── the grid: every headline this dataset can honestly produce ─────────
    # A risk ratio needs two lines drawn — one on the questionnaire, one on
    # screen use — and published claims almost never report either.
    cells = []
    for k in THRESHOLDS:
        heavy = [r for r in rows if r["screen_time_index"] >= k]
        light = [r for r in rows if r["screen_time_index"] < k]
        row = []
        for cut in CUTOFFS:
            ph = sum(1 for r in heavy if r["bdi_total"] >= cut) / len(heavy)
            pl = sum(1 for r in light if r["bdi_total"] >= cut) / len(light)
            a = sum(1 for r in heavy if r["bdi_total"] >= cut)
            c = sum(1 for r in light if r["bdi_total"] >= cut)
            ci = rr_ci(a, len(heavy), c, len(light))
            row.append({
                "rr": round(ph / pl, 3) if pl > 0 else None,
                "ci": list(ci),
                # a ratio whose interval includes 1 is indistinguishable from
                # no difference at all, however quotable the point estimate is
                "solid": bool(ci[0] and ci[0] > 1),
                "ph": round(100 * ph, 2),
                "pl": round(100 * pl, 2),
                "nh_flagged": a,
                "nl_flagged": c,
            })
        cells.append({"threshold": k, "n_heavy": len(heavy), "n_light": len(light), "row": row})

    rrs = [c["rr"] for g in cells for c in g["row"] if c["rr"] is not None]
    n_solid = sum(1 for g in cells for c in g["row"] if c["solid"])
    n_cells = sum(len(g["row"]) for g in cells)
    robustness["grid_cells"] = n_cells
    robustness["grid_solid"] = n_solid
    robustness["grid_solid_pct"] = round(100 * n_solid / n_cells, 1)

    # median leisure hours behind each screen_time_index step, so the slider can
    # be labelled in hours rather than in an index nobody has intuitions about
    hours_at = {}
    for k in THRESHOLDS:
        vals = [r["est_leisure_screen_hours"] for r in rows
                if r["screen_time_index"] >= k and r["est_leisure_screen_hours"] is not None]
        hours_at[str(k)] = round(st.median(vals), 1) if vals else None

    # ── the 21 items, one at a time ───────────────────────────────────────
    # The source file ships the items unlabelled — bdi_item_01..21 and nothing
    # else — so they are reported by number here. Naming them would mean
    # assuming a questionnaire version the file never states.
    per_item = []
    for i, key in enumerate(item_keys, start=1):
        r = pearson([(by_id[x["subject_id"]]["screen_normal_day_1to6"],
                      by_id[x["subject_id"]][key]) for x in rows])
        per_item.append({"item": i, "r": round(r, 4), "ci": list(r_ci(r, n))})

    loads = sorted(d["r"] for d in per_item)
    inner = [d["r"] for d in per_item if loads[1] < d["r"] < loads[-2]]

    # ── robustness: strip the most-loaded items and watch it barely move ──
    order = [d["item"] for d in sorted(per_item, key=lambda d: -d["r"])]
    drop_series = []
    for drop in range(0, 12):
        keep = [i for i in range(1, 22) if i not in order[:drop]]
        r = pearson([(x["screen_time_index"],
                      sum(by_id[x["subject_id"]][f"bdi_item_{i:02d}"] for i in keep))
                     for x in rows])
        drop_series.append({"dropped": drop, "kept": len(keep), "r": round(r, 4)})

    # ── distributions, for the charts ─────────────────────────────────────
    bdi_hist = [0] * 52
    for r in rows:
        bdi_hist[min(51, int(r["bdi_total"]))] += 1

    screen_hist = {}
    for r in rows:
        key = round(r["screen_time_index"], 3)
        screen_hist[key] = screen_hist.get(key, 0) + 1

    data = {
        "slug": "02-screen-time",
        "title": "The Line Someone Drew",
        "source": {
            "name": "Screen Time vs Mental Health (ML-ready)",
            "kaggle": SLUG,
            "retrieved": date.today().isoformat(),
            "subjects": n,
            "items": len(item_keys),
            "boys": sum(1 for r in rows if r["sex"] == "Boy"),
            "girls": sum(1 for r in rows if r["sex"] == "Girl"),
            "bdi_min": int(min(r["bdi_total"] for r in rows)),
            "bdi_max": int(max(r["bdi_total"] for r in rows)),
            "bdi_mean": round(st.mean([r["bdi_total"] for r in rows]), 2),
            "bdi_median": round(st.median([r["bdi_total"] for r in rows]), 1),
        },
        "headline": {
            "screen_r": round(r_screen, 4),
            "screen_r2": round(r_screen ** 2, 4),
            "screen_r2_pct": round(100 * r_screen ** 2, 1),
            "sleepq_r": round(r_sleepq, 4),
            "sleepq_r2": round(r_sleepq ** 2, 4),
            "sleepq_r2_pct": round(100 * r_sleepq ** 2, 1),
            "sleep_hours_r": round(r_sleeph, 4),
            "variance_ratio": round(r_sleepq ** 2 / r_screen ** 2, 1),
            "cutoff_in_file": CUTOFF_IN_FILE,
            "cutoff_verified": exact[0]["cutoff"],
            "cutoff_agreement": exact[0]["agreement"],
            "cutoff_runner_up": runner_up["cutoff"],
            "cutoff_runner_up_agreement": runner_up["agreement"],
            "n_flagged": sum(1 for r in rows if r["bdi_total"] >= CUTOFF_IN_FILE),
            "share_flagged": round(
                100 * sum(1 for r in rows if r["bdi_total"] >= CUTOFF_IN_FILE) / n, 1),
        },
        "cutoff_check": cutoff_check,
        "robustness": robustness,
        "partials": partials,
        "grid": {
            "cutoffs": CUTOFFS,
            "thresholds": THRESHOLDS,
            "default_cutoff": CUTOFF_IN_FILE,
            "default_threshold": 3,
            "hours_at": hours_at,
            "cells": cells,
            "rr_min": min(rrs),
            "rr_max": max(rrs),
        },
        "items": per_item,
        "item_flatness": {
            "mean": round(st.mean([d["r"] for d in per_item]), 4),
            "sd": round(st.pstdev([d["r"] for d in per_item]), 4),
            "min": round(loads[0], 4),
            "max": round(loads[-1], 4),
            "inner_lo": round(min(inner), 4),
            "inner_hi": round(max(inner), 4),
            "inner_n": len(inner),
        },
        "drop_series": drop_series,
        "bdi_hist": bdi_hist,
        "screen_hist": [{"index": k, "n": v} for k, v in sorted(screen_hist.items())],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1), encoding="utf-8")
    print(f"wrote {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")
    print(f"  screen r  {r_screen:+.4f}  (r2 {100*r_screen**2:.1f}%)")
    print(f"  sleepq r  {r_sleepq:+.4f}  (r2 {100*r_sleepq**2:.1f}%)  "
          f"= {r_sleepq**2/r_screen**2:.1f}x the variance")
    print(f"  risk ratio spans {min(rrs)} .. {max(rrs)} across "
          f"{len(CUTOFFS)}x{len(THRESHOLDS)} = {len(rrs)} honest headlines")
    print(f"  per-item loading  mean {data['item_flatness']['mean']:+.4f} "
          f"sd {data['item_flatness']['sd']:.4f}")
    print(f"  `depressed` verified as bdi_total >= {exact[0]['cutoff']} "
          f"(agreement {exact[0]['agreement']}); next best "
          f"{runner_up['cutoff']} at {runner_up['agreement']}")
    rb = robustness
    print(f"  screen  r {rb['screen']['pearson']:+.4f} "
          f"CI [{rb['screen']['ci'][0]:+.4f}, {rb['screen']['ci'][1]:+.4f}] "
          f"spearman {rb['screen']['spearman']:+.4f}")
    print(f"  by sex  " + "  ".join(
        f"{d['sex']} {d['pearson']:+.4f} (n={d['n']})" for d in rb["by_sex"]))
    print(f"  ROBUSTNESS  {n_solid}/{n_cells} grid cells have a 95% CI clear of 1 "
          f"({rb['grid_solid_pct']}%) — the rest are quotable but not "
          f"distinguishable from no difference")


if __name__ == "__main__":
    main()
