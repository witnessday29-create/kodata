"""03 — Pekerja Sejahtera: what a minimum wage is measured in.

Emits web/content/03-pekerja-sejahtera/data.json, the single contract between
this analysis and the web layer. Nothing downstream re-computes anything.

Two things about this source have to be settled before any figure from it is
worth printing, and both are emitted rather than quietly handled:

  1. `INDONESIA` is a row among the provinces. Thirty-five rows, thirty-four
     provinces, one national aggregate sitting in the same column as the units
     it aggregates. Every cross-province statistic is wrong until it is removed.

  2. The UMP 2021 column is corrupt in 13 of the 34 provinces. The proof is
     internal to the file — see `integrity` below — and the piece publishes it,
     because a site whose whole claim is that its numbers can be checked should
     show its checking working rather than assert that it happened.

stdlib only, on purpose: at 34 provinces pandas buys nothing, and a pipeline
with no third-party dependency beyond kagglehub runs anywhere Python does.
analysis/notebooks/ re-derives these results in pandas, down a different
arithmetic path, so agreement is not an artefact of either implementation.

    python analysis/pipelines/03_pekerja_sejahtera/build.py
"""
import csv, json, math, statistics as st
from collections import defaultdict
from datetime import date
from pathlib import Path

import kagglehub

SLUG = "rezkyyayang/pekerja-sejahtera"
OUT = (Path(__file__).resolve().parents[3]
       / "web" / "content" / "03-pekerja-sejahtera" / "data.json")

# The aggregate hiding among the units.
NATIONAL = "INDONESIA"

# The province the piece follows. Not chosen for effect: it holds the fewest
# people above the line in every clean year of the panel, which main() asserts.
SUBJECT = "DI YOGYAKARTA"

# BPS reports the poverty line twice a year and splits it by area. March,
# total, urban-and-rural-combined is the headline series; the others are
# emitted as robustness so the choice is visible rather than buried.
PERIOD, AREA, KIND = "MARET", "PERDESAANPERKOTAAN", "TOTAL"

# The statutory full-time month in Indonesia: 40 hours a week, 173 hours a
# month. Used only to put an hourly wage on the same scale as a monthly floor.
HOURS = 173

# The year the source cannot be trusted for UMP. Established, not assumed —
# `integrity` carries the test that condemns it.
BAD_YEAR = 2021


# ---------------------------------------------------------------- load

def load(base, name):
    with open(f"{base}/{name}", newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def num(s):
    """Blanks and NA become None rather than zero. A missing minimum wage is
    not a minimum wage of nothing."""
    s = (s or "").strip()
    if not s or s.upper() in ("NA", "NULL", "NAN", "-"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


# ---------------------------------------------------------------- stats

def pearson(xs, ys):
    mx, my = st.mean(xs), st.mean(ys)
    n = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    d = math.sqrt(sum((a - mx) ** 2 for a in xs) * sum((b - my) ** 2 for b in ys))
    return n / d if d else float("nan")


def ranks(v):
    """Average ranks, so ties do not invent an ordering."""
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


def spearman(xs, ys):
    return pearson(ranks(xs), ranks(ys))


def theil(v):
    """Theil's T. An entropy measure, so it is additively decomposable and
    scale-free — the second property is what lets 2002 and 2022 be compared
    without deflating anything."""
    mu = st.mean(v)
    return sum((x / mu) * math.log(x / mu) for x in v) / len(v)


def demean(obs, keys, iters=200):
    """Within transformation by iterated demeaning.

    obs rows are [group_a, group_b, y, x]. Sweeping the group means out
    repeatedly converges on the two-way within estimator without ever building
    a design matrix of dummies — which at 34 provinces x 7 years would be more
    machinery than the question needs.
    """
    X = [r[:] for r in obs]
    for _ in range(iters):
        for k in keys:
            g = defaultdict(list)
            for r in X:
                g[r[k]].append(r)
            for rs in g.values():
                my, mx = st.mean(r[2] for r in rs), st.mean(r[3] for r in rs)
                for r in rs:
                    r[2] -= my
                    r[3] -= mx
    return X


def slope(obs, keys, n_groups, n_periods, cluster_on=0):
    """OLS slope on the demeaned data, with two standard errors.

    The conventional one assumes the residual of a province in one year says
    nothing about the same province in the next, which for a wage set once a
    year and rarely cut is plainly false. So a cluster-robust error by province
    (CR1) is reported beside it, and the piece quotes the larger.
    """
    X = demean(obs, keys)
    den = sum(r[3] ** 2 for r in X)
    beta = sum(r[2] * r[3] for r in X) / den
    res = [r[2] - beta * r[3] for r in X]

    k = n_groups + (n_periods if len(keys) > 1 else 0) + 1
    df = len(X) - k
    se = math.sqrt(sum(e * e for e in res) / df / den)

    # CR1: sum the within-cluster score, square it, correct for G and df
    score = defaultdict(float)
    for r, e in zip(X, res):
        score[r[cluster_on]] += r[3] * e
    G = len(score)
    meat = sum(s * s for s in score.values())
    c = (G / (G - 1)) * ((len(X) - 1) / df)
    se_cl = math.sqrt(c * meat / den ** 2)

    return {
        "beta": round(beta, 4),
        "se": round(se, 4),
        "t": round(beta / se, 2),
        "se_cluster": round(se_cl, 4),
        "t_cluster": round(beta / se_cl, 2),
        "ci_cluster": [round(beta - 1.96 * se_cl, 3), round(beta + 1.96 * se_cl, 3)],
        "n": len(X),
        "clusters": G,
        "df": df,
    }


# ---------------------------------------------------------------- integrity

def audit_ump_2021(order, W, provs):
    """Condemn or clear the 2021 UMP column, using only the file itself.

    Three independent tests, none of which needs an outside source:

      rank      a year that disagrees with both its neighbours while those two
                agree with each other is the odd one out, not a real movement.
      envelope  UMP is nominally non-decreasing in law, and no province in this
                file has 2022 below 2020 — so a 2021 outside [2020, 2022] is
                impossible rather than merely surprising.
      provenance for each impossible value, look for it elsewhere in the file.
                Nine of them are another province's 2020 wage.
    """
    def rho(y1, y2):
        ps = [p for p in order if W[p].get(y1) and W[p].get(y2)]
        return round(spearman([W[p][y1] for p in ps], [W[p][y2] for p in ps]), 4)

    idx = {p: i for i, p in enumerate(order)}
    viol = []
    for p in provs:
        a, b, c = W[p].get(2020), W[p].get(BAD_YEAR), W[p].get(2022)
        if not (a and b and c):
            continue
        if min(a, c) - 1 <= b <= max(a, c) + 1:
            continue
        # whose number is it? tolerance of Rp 2 catches the off-by-one
        # fingerprint that says this column took a different code path
        src = [(q, y, round(W[q][y] - b))
               for q in order for y in (2020, 2022)
               if q != p and W[q].get(y) is not None and abs(W[q][y] - b) <= 2]
        viol.append({
            "province": p,
            "y2020": int(a), "in_file": int(b), "y2022": int(c),
            "belongs_to": src[0][0] if src else None,
            "belongs_to_year": src[0][1] if src else None,
            "off_by_rp": src[0][2] if src else None,
            "row_delta": idx[src[0][0]] - idx[p] if src else None,
        })

    # The obvious first guess — one column slipped a row — and its refutation.
    shifted = {order[i]: W[order[i + 1]].get(BAD_YEAR) for i in range(len(order) - 1)}
    ps = [p for p in provs if shifted.get(p) and W[p].get(2020)]
    rho_shift = round(spearman([W[p][2020] for p in ps], [shifted[p] for p in ps]), 4)

    bad = {v["province"] for v in viol}
    clean = [p for p in provs if p not in bad and W[p].get(2020) and W[p].get(BAD_YEAR)]
    frozen = [p for p in clean if abs(W[p][BAD_YEAR] - W[p][2020]) <= 1]
    rupiah = sorted(p for p in provs
                    if W[p].get(2020) and W[p].get(BAD_YEAR)
                    and 0 < abs(W[p][BAD_YEAR] - W[p][2020]) <= 1)

    return {
        "excluded_year": BAD_YEAR,
        "rho_2020_2022": rho(2020, 2022),
        "rho_2020_2021": rho(2020, BAD_YEAR),
        "rho_2021_2022": rho(BAD_YEAR, 2022),
        "rho_neighbours_2019_2020": rho(2019, 2020),
        "n_provinces": len(provs),
        "n_violations": len(viol),
        "n_traced": sum(1 for v in viol if v["belongs_to"]),
        "violations": viol,
        "shift_hypothesis": {
            "rho_repaired_vs_2020": rho_shift,
            "rho_raw_vs_2020": rho(2020, BAD_YEAR),
            "rejected": rho_shift < rho(2020, BAD_YEAR),
            "row_deltas": sorted({v["row_delta"] for v in viol if v["row_delta"] is not None}),
        },
        "frozen_exactly": len(frozen),
        "clean_rows": len(clean),
        "rupiah_off_by_one": rupiah,
        "no_province_fell_2020_to_2022": not any(
            W[p].get(2022) and W[p].get(2020) and W[p][2022] < W[p][2020] for p in provs),
    }


def main():
    base = kagglehub.dataset_download(SLUG)

    wide = load(base, "ump.csv")
    order = [r["provinsi"] for r in wide]        # the file's own row order
    W = {r["provinsi"]: {int(k.split(".")[1]): num(v)
                         for k, v in r.items() if k != "provinsi"}
         for r in wide}

    gk_rows = load(base, "gk.df.csv")
    pe_rows = load(base, "peng.df.csv")
    up_rows = load(base, "upah.df.csv")

    GK = {(r["provinsi"], int(r["tahun"]), r["periode"], r["daerah"], r["jenis"]): num(r["gk"])
          for r in gk_rows}
    PE = {(r["provinsi"], int(r["tahun"]), r["daerah"], r["jenis"]): num(r["peng"])
          for r in pe_rows}
    UPAH = {(r["provinsi"], int(r["tahun"])): num(r["upah"]) for r in up_rows}

    assert NATIONAL in order, "the national row is gone; the aggregate trap may have been fixed upstream"
    provs = [p for p in order if p != NATIONAL]
    assert len(provs) == 34, f"expected 34 provinces beside {NATIONAL}, got {len(provs)}"

    def gk(p, y, period=PERIOD, area=AREA, kind=KIND):
        return GK.get((p, y, period, area, kind))

    integrity = audit_ump_2021(order, W, provs)
    assert integrity["n_violations"] == 13, integrity["n_violations"]
    assert integrity["rho_2020_2022"] > 0.99, "2020 and 2022 stopped agreeing"
    assert integrity["shift_hypothesis"]["rejected"], "a one-row shift now explains it"
    assert integrity["no_province_fell_2020_to_2022"]

    ump_years = sorted(y for p in provs for y in W[p] if W[p][y])
    gk_years = sorted({k[1] for k, v in GK.items() if v})
    years = [y for y in range(min(gk_years), max(ump_years) + 1)
             if y != BAD_YEAR and any(W[p].get(y) and gk(p, y) for p in provs)]

    # ── the ratio, in people ──────────────────────────────────────────────
    # `exact` is what every statistic below is computed from; `persons` is the
    # rounded copy that ships for display. Keeping them apart is not fussiness:
    # rounding before a threshold comparison moved a province-year of
    # 4.99998 to the wrong side of "under five" and cost a whole percentage
    # point off a published figure. The pandas audit caught it.
    raw = []
    for p in provs:
        for y in years:
            u, g = W[p].get(y), gk(p, y)
            if u and g:
                raw.append({"province": p, "year": y,
                            "ump": int(u), "gk": int(g), "exact": u / g})
    cells = [{k2: v2 for k2, v2 in c.items() if k2 != "exact"}
             | {"persons": round(c["exact"], 3)} for c in raw]

    by_year = []
    for y in years:
        v = [c for c in raw if c["year"] == y]
        r = sorted(c["exact"] for c in v)
        lo = min(v, key=lambda c: c["exact"])
        hi = max(v, key=lambda c: c["exact"])
        by_year.append({
            "year": y, "n": len(v),
            "median": round(st.median(r), 3),
            "p10": round(r[len(r) // 10], 3),
            "min": round(r[0], 3), "max": round(r[-1], 3),
            "cv": round(st.stdev(r) / st.mean(r), 4),
            "lowest": lo["province"], "highest": hi["province"],
        })

    allp = [c["exact"] for c in raw]
    thresholds = [{"people": k,
                   "n": sum(1 for x in allp if x < k),
                   "pct": round(100 * sum(1 for x in allp if x < k) / len(allp), 1)}
                  for k in (3, 4, 5, 6)]

    # the subject: lowest in every clean year, which is the claim, so assert it
    for row in by_year:
        assert row["lowest"] == SUBJECT, f"{row['year']} lowest is {row['lowest']}"
    mine = [c for c in raw if c["province"] == SUBJECT]
    subject = {
        "province": SUBJECT,
        "series": [c for c in cells if c["province"] == SUBJECT],
        "worst": next(c for c in cells
                      if c["province"] == SUBJECT
                      and c["year"] == min(mine, key=lambda d: d["exact"])["year"]),
        "latest": next(c for c in cells
                       if c["province"] == SUBJECT
                       and c["year"] == max(c2["year"] for c2 in mine)),
        "lowest_in_every_year": True,
    }
    subject_latest_exact = max(mine, key=lambda c: c["year"])["exact"]

    # ── does the floor answer the question it is supposed to answer ───────
    obs = [[p, y, math.log(W[p][y]), math.log(gk(p, y))]
           for p in provs for y in years if W[p].get(y) and gk(p, y)]
    n_prov = len({o[0] for o in obs})
    n_year = len({o[1] for o in obs})
    elasticity = {
        "province_fe": slope(obs, [0], n_prov, n_year),
        "twoway_fe": slope(obs, [0, 1], n_prov, n_year),
    }
    lo, hi = elasticity["twoway_fe"]["ci_cluster"]
    assert lo < 0 < hi, "the two-way interval no longer contains zero"
    assert elasticity["province_fe"]["beta"] > 1, "the one-way estimate moved"

    cross = []
    for y in years:
        d = [(W[p][y], gk(p, y)) for p in provs if W[p].get(y) and gk(p, y)]
        xs = [a for a, _ in d]
        ys = [b for _, b in d]
        lx, ly = [math.log(a) for a in xs], [math.log(b) for b in ys]
        mlx, mly = st.mean(lx), st.mean(ly)
        beta = (sum((b - mly) * (a - mlx) for a, b in zip(lx, ly))
                / sum((b - mly) ** 2 for b in ly))
        cross.append({"year": y, "n": len(d),
                      "r": round(pearson(xs, ys), 4),
                      "rho": round(spearman(xs, ys), 4),
                      "elasticity": round(beta, 3),
                      "r2": round(pearson(lx, ly) ** 2, 4),
                      "r2_pct": round(100 * pearson(lx, ly) ** 2, 1)})

    # ── twenty years, and no convergence ─────────────────────────────────
    dispersion = []
    for y in sorted(set(ump_years)):
        v = [W[p][y] for p in provs if W[p].get(y)]
        if len(v) > 5 and y != BAD_YEAR:
            dispersion.append({"year": y, "n": len(v),
                               "theil": round(theil(v), 5),
                               "cv": round(st.stdev(v) / st.mean(v), 4),
                               "max_over_min": round(max(v) / min(v), 3)})

    first, last = years[0], years[-1]
    common = [p for p in provs
              if W[p].get(first) and W[p].get(last) and gk(p, first) and gk(p, last)]
    a = [W[p][first] / gk(p, first) for p in common]
    b = [W[p][last] / gk(p, last) for p in common]
    movers = sorted(({"province": p, "first": round(x, 3), "last": round(y2, 3),
                      "change": round(y2 - x, 3)} for p, x, y2 in zip(common, a, b)),
                    key=lambda d: d["change"])
    persistence = {
        "first_year": first, "last_year": last, "n": len(common),
        "spearman": round(spearman(a, b), 4),
        "pearson": round(pearson(a, b), 4),
        "fell_most": movers[:3], "rose_most": movers[-3:][::-1],
    }

    # ── a welfare measure that needs no line drawn ────────────────────────
    engel = []
    for y in sorted({k[1] for k in PE}):
        for area in ("PERKOTAAN", "PERDESAAN"):
            ln = [GK[(p, y, PERIOD, area, "MAKANAN")] / GK[(p, y, PERIOD, area, KIND)]
                  for p in provs
                  if GK.get((p, y, PERIOD, area, "MAKANAN")) and GK.get((p, y, PERIOD, area, KIND))]
            sp = [PE[(p, y, area, "MAKANAN")] / PE[(p, y, area, KIND)]
                  for p in provs
                  if PE.get((p, y, area, "MAKANAN")) and PE.get((p, y, area, KIND))]
            if sp:
                engel.append({
                    "year": y, "area": area, "n_spending": len(sp), "n_line": len(ln),
                    "spending_food_share": round(st.median(sp), 4),
                    "line_food_share": round(st.median(ln), 4) if ln else None,
                    "gap": round(st.median(ln) - st.median(sp), 4) if ln else None,
                })

    # ── the floor becoming the ceiling ───────────────────────────────────
    floor = []
    for y in sorted({k[1] for k in UPAH}):
        if y == BAD_YEAR:
            continue
        v = [(p, (UPAH[(p, y)] * HOURS) / W[p][y]) for p in provs
             if UPAH.get((p, y)) and W[p].get(y)]
        if v:
            lowest = sorted(v, key=lambda t: t[1])[:3]
            floor.append({"year": y, "n": len(v),
                          "median": round(st.median([x for _, x in v]), 4),
                          "below_minimum": sum(1 for _, x in v if x < 1),
                          "lowest": [{"province": p, "ratio": round(x, 3)} for p, x in lowest]})

    # ── the signature: every clean province-year, the subject marked ──────
    BINS, TOP = 48, 9.6
    hist = [0] * BINS
    for x in allp:
        hist[min(BINS - 1, int(x / TOP * BINS))] += 1

    # ── robustness: the choices this pipeline made, and what they cost ────
    def median_persons(period, area):
        v = [W[p][y] / GK[(p, y, period, area, KIND)]
             for p in provs for y in years
             if W[p].get(y) and GK.get((p, y, period, area, KIND))]
        return round(st.median(v), 3), len(v)

    variants = [{"period": pr, "area": ar,
                 "median_persons": median_persons(pr, ar)[0],
                 "n": median_persons(pr, ar)[1]}
                for pr in ("MARET", "SEPTEMBER")
                for ar in ("PERDESAANPERKOTAAN", "PERKOTAAN", "PERDESAAN")]

    with_bad = [W[p][BAD_YEAR] / gk(p, BAD_YEAR) for p in provs
                if W[p].get(BAD_YEAR) and gk(p, BAD_YEAR)]

    data = {
        "slug": "03-pekerja-sejahtera",
        "title": "How Many People Is a Wage",
        "source": {
            "name": "Pekerja Sejahtera",
            "kaggle": SLUG,
            "retrieved": date.today().isoformat(),
            "rows_in_file": len(order),
            "provinces": len(provs),
            "national_row": NATIONAL,
            "ump_from": min(ump_years), "ump_to": max(ump_years),
            "gk_from": min(gk_years), "gk_to": max(gk_years),
            "upah_from": min(k[1] for k in UPAH), "upah_to": max(k[1] for k in UPAH),
            "peng_from": min(k[1] for k in PE), "peng_to": max(k[1] for k in PE),
            "period": PERIOD, "area": AREA, "hours_per_month": HOURS,
            "years_used": years,
            "files": [
                {"name": "ump.csv", "rows": len(wide), "unit": "a province, as 21 years of minimum wage"},
                {"name": "gk.df.csv", "rows": len(gk_rows), "unit": "a province-year-period-area-kind poverty line"},
                {"name": "peng.df.csv", "rows": len(pe_rows), "unit": "a province-year-area-kind expenditure"},
                {"name": "upah.df.csv", "rows": len(up_rows), "unit": "a province-year hourly wage"},
            ],
        },
        "integrity": integrity,
        "headline": {
            "persons_median_first": by_year[0]["median"],
            "persons_median_last": by_year[-1]["median"],
            "persons_median_peak": max(r["median"] for r in by_year),
            "persons_peak_year": max(by_year, key=lambda r: r["median"])["year"],
            "persons_min": round(min(allp), 3), "persons_max": round(max(allp), 3),
            "cv_first": by_year[0]["cv"], "cv_last": by_year[-1]["cv"],
            "under_four_pct": next(t["pct"] for t in thresholds if t["people"] == 4),
            "under_five_pct": next(t["pct"] for t in thresholds if t["people"] == 5),
            "province_years": len(allp),
            "oneway_beta": elasticity["province_fe"]["beta"],
            "twoway_beta": elasticity["twoway_fe"]["beta"],
            "twoway_ci": elasticity["twoway_fe"]["ci_cluster"],
            "cross_r2_pct": round(st.median([c["r2_pct"] for c in cross]), 1),
            "theil_first": dispersion[0]["theil"], "theil_last": dispersion[-1]["theil"],
            "rank_spearman": persistence["spearman"],
            "floor_median_first": floor[0]["median"], "floor_median_last": floor[-1]["median"],
            "below_minimum_first": floor[0]["below_minimum"],
            "below_minimum_last": floor[-1]["below_minimum"],
        },
        "subject": subject,
        "persons": {"years": years, "by_year": by_year, "cells": cells,
                    "thresholds": thresholds},
        "elasticity": {**elasticity, "cross_section": cross},
        "dispersion": {"series": dispersion, "persistence": persistence},
        "engel": engel,
        "floor": {"hours": HOURS, "series": floor},
        "hist": {"bins": BINS, "top": TOP, "counts": hist,
                 "mark": min(BINS - 1, int(subject_latest_exact / TOP * BINS))},
        "robustness": {
            "variants": variants,
            "bad_year_if_kept": {
                "year": BAD_YEAR, "n": len(with_bad),
                "median": round(st.median(with_bad), 3),
                "cv": round(st.stdev(with_bad) / st.mean(with_bad), 4),
                "min": round(min(with_bad), 3), "max": round(max(with_bad), 3),
            },
            "household_size_is_external": (
                "This pipeline emits people, not a verdict. The average Indonesian "
                "household size is not in this file, so it is never multiplied in."),
            "scale_economies": (
                "A per-capita line times N assumes a household of N shares nothing. "
                "It does, so this ratio understates how many a wage can hold."),
            "upah_unit_assumed": (
                "`upah` is read as rupiah per hour. The file does not say so; "
                "upah x 173 sits within a quarter of the legal monthly floor in "
                "every province-year, which is the only evidence for it."),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1), encoding="utf-8")
    print(f"wrote {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")

    h = data["headline"]
    print(f"  {len(provs)} provinces, {NATIONAL} removed from among them")
    print(f"  INTEGRITY  ump {BAD_YEAR} condemned: {integrity['n_violations']}/34 provinces "
          f"outside [2020, 2022], {integrity['n_traced']} traced to another province")
    print(f"             rho(2020,2022)={integrity['rho_2020_2022']:+.4f} but "
          f"rho(2020,{BAD_YEAR})={integrity['rho_2020_2021']:+.4f} and "
          f"rho({BAD_YEAR},2022)={integrity['rho_2021_2022']:+.4f}")
    print(f"             one-row-shift hypothesis rejected: repaired rho "
          f"{integrity['shift_hypothesis']['rho_repaired_vs_2020']:+.4f} < raw "
          f"{integrity['shift_hypothesis']['rho_raw_vs_2020']:+.4f}")
    print(f"             {integrity['frozen_exactly']} of the {integrity['clean_rows']} "
          f"clean provinces froze the wage exactly — the real {BAD_YEAR}")
    print(f"  PEOPLE     median province {h['persons_median_first']} -> "
          f"{h['persons_median_last']} (peak {h['persons_median_peak']} in "
          f"{h['persons_peak_year']}), range {h['persons_min']}..{h['persons_max']}")
    print(f"             {h['under_five_pct']}% of {h['province_years']} province-years "
          f"under five people, {h['under_four_pct']}% under four")
    print(f"  SUBJECT    {SUBJECT} lowest in all {len(by_year)} clean years; "
          f"worst {subject['worst']['persons']} in {subject['worst']['year']}")
    pf, tw = elasticity["province_fe"], elasticity["twoway_fe"]
    print(f"  ELASTICITY province FE {pf['beta']:+.3f} (cluster se {pf['se_cluster']:.3f}, "
          f"t {pf['t_cluster']:+.1f})")
    print(f"             + year FE  {tw['beta']:+.3f} (cluster se {tw['se_cluster']:.3f}, "
          f"t {tw['t_cluster']:+.1f}) 95% CI {tw['ci_cluster']} — contains zero")
    print(f"  DISPERSION theil {h['theil_first']:.5f} ({dispersion[0]['year']}) -> "
          f"{h['theil_last']:.5f} ({dispersion[-1]['year']}); rank rho "
          f"{h['rank_spearman']:+.3f} across {persistence['n']} provinces")
    e22 = [e for e in engel if e["year"] == max(x["year"] for x in engel)]
    for e in e22:
        print(f"  ENGEL      {e['year']} {e['area']:<11} line {e['line_food_share']:.3f} "
              f"vs actual {e['spending_food_share']:.3f}  gap {e['gap']:+.3f}")
    print(f"  FLOOR      upah x {HOURS} / ump: median {h['floor_median_first']:.3f} -> "
          f"{h['floor_median_last']:.3f}; provinces under the legal minimum "
          f"{h['below_minimum_first']} -> {h['below_minimum_last']}")


if __name__ == "__main__":
    main()
