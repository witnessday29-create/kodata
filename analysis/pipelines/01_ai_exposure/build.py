"""01 — Will AI take my job? Exposure, skills and wages.

Emits web/content/01-ai-exposure/data.json, the single contract between this
analysis and the web layer. Nothing downstream re-computes anything.

stdlib only: this machine's Application Control policy blocks pandas' compiled
extensions, and at n=271 there is nothing pandas would buy us.

    python analysis/pipelines/01_ai_exposure/build.py
"""
import csv, json, math, statistics as st
from collections import defaultdict
from datetime import date
from pathlib import Path

import kagglehub

SLUG = "kylefengkfeng209/will-ai-take-my-job-exposure-skills-and-wages"
OUT = Path(__file__).resolve().parents[3] / "web" / "content" / "01-ai-exposure" / "data.json"

# jitter cloud density: one plotted dot per this many jobs
JOBS_PER_DOT = 1000
SUBJECT = "Writers and authors"


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
    x = [a for a, _ in pairs]
    y = [b for _, b in pairs]
    mx, my = st.mean(x), st.mean(y)
    num = sum((a - mx) * (b - my) for a, b in pairs)
    den = math.sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))
    return num / den


def spearman(pairs):
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
    rx = rank([a for a, _ in pairs])
    ry = rank([b for _, b in pairs])
    return pearson(list(zip(rx, ry)))


def r_ci(r, n, z=1.96):
    """Fisher z interval. Analytic, so the pipeline stays deterministic — a
    bootstrap would need a seed and buy nothing at this sample size."""
    if n <= 3:
        return (float("nan"), float("nan"))
    f, se = math.atanh(r), 1 / math.sqrt(n - 3)
    return round(math.tanh(f - z * se), 4), round(math.tanh(f + z * se), 4)


def main():
    base = kagglehub.dataset_download(SLUG)
    df = load(base, "ai_job_exposure.csv")
    prof = load(base, "occupation_cognitive_profile.csv")
    ab = load(base, "cognitive_ability_ai_exposure.csv")

    total_emp = sum(r["employment_2024"] for r in df)
    rank_exp = sorted(df, key=lambda z: -z["ai_exposure_llm_human"])
    subject = next(r for r in df if r["occupation_title"] == SUBJECT)

    # ---- the two exposure layers, and whether they agree ------------
    #
    # The dataset scores exposure twice, at two levels of description:
    #   per cognitive ability (21) and per occupation (271).
    # If both measure the same construct, an occupation's rating should be
    # predictable from the abilities it is built out of. It is not.
    #
    W = {r["cognitive_ability"]: r["ai_exposure_score"] for r in ab}
    by_soc = {r["soc_code"]: r for r in prof}
    # Take the ability order from the profile file's own columns — that is the
    # order they are listed on the rating instrument, and row numbers matter.
    abilities = [c for c in prof[0] if c not in ("soc_code", "occupation_title")]
    assert set(abilities) == set(W), "ability names differ between the two files"

    rows = []
    for r in df:
        p = by_soc.get(r["soc_code"])
        if not p or any(p.get(a) is None for a in abilities):
            continue
        lv = {a: p[a] for a in abilities}
        # weighted mean of ability-level exposure, weighted by how strongly the
        # occupation draws on each ability
        pred = sum(lv[a] * W[a] for a in abilities) / sum(lv.values())
        rows.append({
            "title": r["occupation_title"], "pred": pred,
            "act": r["ai_exposure_llm_human"],
            "wage": r["median_annual_wage_usd"], "emp": r["employment_2024"],
        })

    r_layers = pearson([(x["pred"], x["act"]) for x in rows])

    # put the prediction on the rating's scale so residuals read in rating units
    pm, ps = st.mean([x["pred"] for x in rows]), st.pstdev([x["pred"] for x in rows])
    am, asd = st.mean([x["act"] for x in rows]), st.pstdev([x["act"] for x in rows])
    for x in rows:
        x["fit"] = (x["pred"] - pm) / ps * asd + am
        x["res"] = x["act"] - x["fit"]
    res_sd = st.pstdev([x["res"] for x in rows])
    for x in rows:
        x["z"] = x["res"] / res_sd
    by_res = sorted(rows, key=lambda z: -z["res"])
    subj_res = next(x for x in rows if x["title"] == SUBJECT)

    # ---- robustness -------------------------------------------------
    #
    # The rescaling above is a substantive assumption, not a regression: it asks
    # "if more-exposed parts implied a more-exposed whole, where would this
    # occupation sit?" Least squares cannot answer that question here, because
    # the two layers correlate negatively, so its fitted line slopes DOWN and
    # bakes in the very inversion the piece is about.
    #
    # That defence does not make the residual ranking scale-free, and it is not.
    # So both are computed, the disagreement is published, and the piece leads
    # with the one framing that needs no scaling at all: rank displacement.
    #
    n_obs = len(rows)
    sxy = sum((x["pred"] - pm) * (x["act"] - am) for x in rows)
    sxx = sum((x["pred"] - pm) ** 2 for x in rows)
    ols_slope = sxy / sxx
    for x in rows:
        x["ols_res"] = x["act"] - (am + ols_slope * (x["pred"] - pm))
    ols_sd = st.pstdev([x["ols_res"] for x in rows])
    by_ols = sorted(rows, key=lambda z: -z["ols_res"])

    # rank displacement: no scaling anywhere, so nothing here can be an artefact
    # of how the prediction was mapped onto the rating
    pr_i = {x["title"]: i + 1 for i, x in enumerate(sorted(rows, key=lambda z: -z["pred"]))}
    ar_i = {x["title"]: i + 1 for i, x in enumerate(sorted(rows, key=lambda z: -z["act"]))}
    for x in rows:
        x["move"] = pr_i[x["title"]] - ar_i[x["title"]]
    by_move = sorted(rows, key=lambda z: -z["move"])

    robustness = {
        "n": n_obs,
        "layers_r": round(r_layers, 4),
        "layers_r_ci": list(r_ci(r_layers, n_obs)),
        "layers_spearman": round(spearman([(x["pred"], x["act"]) for x in rows]), 4),
        "scale_invariant": True,  # Pearson is unchanged by any linear rescale of pred
        "ols_slope": round(ols_slope, 4),
        "subject": {
            "shipped_residual": round(subj_res["res"], 3),
            "shipped_z": round(subj_res["z"], 2),
            "shipped_rank": by_res.index(subj_res) + 1,
            "ols_residual": round(subj_res["ols_res"], 3),
            "ols_z": round(subj_res["ols_res"] / ols_sd, 2),
            "ols_rank": by_ols.index(subj_res) + 1,
            "move": subj_res["move"],
            "move_rank": by_move.index(subj_res) + 1,
        },
        # stated plainly so the page cannot overclaim by accident
        "residual_rank_is_scale_dependent":
            (by_res.index(subj_res) + 1) != (by_ols.index(subj_res) + 1),
        "displacement_is_scale_free": True,
    }

    displacement = {
        "risers": [{"title": x["title"], "predicted": pr_i[x["title"]],
                    "rated": ar_i[x["title"]], "move": x["move"]} for x in by_move[:8]],
        "fallers": [{"title": x["title"], "predicted": pr_i[x["title"]],
                     "rated": ar_i[x["title"]], "move": x["move"]} for x in by_move[-8:]],
    }

    # ---- exposure bands --------------------------------------------
    bands = []
    g = defaultdict(list)
    for r in df:
        g[r["ai_exposure_level"]].append(r)
    for k in ["Low", "Medium", "High"]:
        rs = g[k]
        emp = sum(x["employment_2024"] for x in rs)
        bands.append({
            "level": k, "n": len(rs), "employment": int(emp),
            "share": round(100 * emp / total_emp, 1),
            "median_wage": int(st.median([x["median_annual_wage_usd"] for x in rs])),
            "median_growth": st.median([x["projected_growth_pct_2024_2034"] for x in rs]),
        })

    # ---- education gradient ----------------------------------------
    g = defaultdict(list)
    for r in df:
        g[r["education_required"]].append(r)
    education = sorted(
        ({"level": k, "n": len(rs),
          "median_exposure": round(st.median([x["ai_exposure_llm_human"] for x in rs]), 3),
          "median_wage": int(st.median([x["median_annual_wage_usd"] for x in rs])),
          "employment": int(sum(x["employment_2024"] for x in rs))}
         for k, rs in g.items() if k != "See How to Become One"),
        key=lambda x: x["median_exposure"])

    # ---- the subject's cognitive profile, as percentiles ------------
    #
    # `abilities` preserves the source file's own column order, which is the
    # order the abilities are listed on the rating instrument. Row numbers below
    # are that order — Originality is row 6, and the story depends on it.
    #
    pw = by_soc[subject["soc_code"]]
    profile = []
    for i, a in enumerate(abilities, 1):
        vals = sorted(r[a] for r in prof if r[a] is not None)
        pct = 100 * sum(1 for v in vals if v < pw[a]) / len(vals)
        profile.append({"row": i, "ability": a, "level": pw[a],
                        "percentile": round(pct, 1), "ability_exposure": W[a]})
    originality_row = next(p["row"] for p in profile if p["ability"] == "Originality")

    # ---- the two orderings, as ranks, for the slope graph -----------
    pr = sorted(rows, key=lambda z: -z["pred"])
    ar = sorted(rows, key=lambda z: -z["act"])
    slope = [[pr.index(x) + 1, ar.index(x) + 1] for x in rows]
    slope_hero = rows.index(subj_res)

    # ---- opening: real scatter, one dot per JOBS_PER_DOT jobs -------
    wages = [r["median_annual_wage_usd"] for r in df]
    lo, hi = math.log(min(wages)), math.log(max(wages))
    cloud = []
    for r in df:
        cloud.append([
            round(r["ai_exposure_llm_human"], 3),
            round((math.log(r["median_annual_wage_usd"]) - lo) / (hi - lo), 4),
            max(1, round(r["employment_2024"] / JOBS_PER_DOT)),
        ])
    hero_idx = df.index(subject)

    high = [r for r in df if r["ai_exposure_level"] == "High"]
    growing = sum(1 for r in high if r["projected_growth_pct_2024_2034"] > 0)

    data = {
        "slug": "01-ai-exposure",
        "title": "What Makes Writing Writing",
        "source": {
            "name": "Will AI Take My Job? Exposure, Skills and Wages",
            "kaggle": SLUG,
            "retrieved": date.today().isoformat(),
            "occupations": len(df),
            "employment_covered": int(total_emp),
        },
        "opening": {
            "type": "collapse",
            "cloud": cloud,
            "hero": hero_idx,
            "dots": sum(c[2] for c in cloud),
            "jobs_per_dot": JOBS_PER_DOT,
            "subject": SUBJECT,
            "soc": subject["soc_code"],
        },
        "subject": {
            "title": SUBJECT,
            "soc": subject["soc_code"],
            "wage": int(subject["median_annual_wage_usd"]),
            "employment": int(subject["employment_2024"]),
            "growth": subject["projected_growth_pct_2024_2034"],
            "outlook": subject["growth_outlook"],
            "exposure": subject["ai_exposure_llm_human"],
            "exposure_gpt4": subject["ai_exposure_llm_gpt4"],
            "exposure_rank": rank_exp.index(subject) + 1,
            "education": subject["education_required"],
            "top_ability": subject["top_cognitive_ability"],
            "fit": round(subj_res["fit"], 3),
            "residual": round(subj_res["res"], 3),
            "residual_z": round(subj_res["z"], 2),
            "residual_rank": by_res.index(subj_res) + 1,
            "rank_predicted": slope[slope_hero][0],
            "rank_actual": slope[slope_hero][1],
        },
        "slope": {"pairs": slope, "hero": slope_hero, "n": len(slope)},
        "robustness": robustness,
        "displacement": displacement,
        # every occupation, so a reader can look up their own rather than take
        # the subject's word for it. Short keys: this ships to the browser.
        "occupations": [
            {
                "t": x["title"],
                "soc": next(r["soc_code"] for r in df if r["occupation_title"] == x["title"]),
                "e": x["act"],
                "er": rank_exp.index(
                    next(r for r in df if r["occupation_title"] == x["title"])) + 1,
                "pr": pr_i[x["title"]],
                "ar": ar_i[x["title"]],
                "mv": x["move"],
                "w": int(x["wage"]),
                "g": next(r["projected_growth_pct_2024_2034"] for r in df
                          if r["occupation_title"] == x["title"]),
            }
            for x in sorted(rows, key=lambda z: z["title"])
        ],
        "originality_row": originality_row,
        "findings": {
            "layers_disagree": round(r_layers, 3),
            "layers_r2": round(r_layers ** 2, 3),
            "layers_ci": list(r_ci(r_layers, len(rows))),
            "exposure_wage_pearson": round(pearson([(r["ai_exposure_llm_human"], r["median_annual_wage_usd"]) for r in df]), 3),
            "exposure_wage_ci": list(r_ci(
                pearson([(r["ai_exposure_llm_human"], r["median_annual_wage_usd"]) for r in df]),
                len(df))),
            "exposure_wage_spearman": round(spearman([(r["ai_exposure_llm_human"], r["median_annual_wage_usd"]) for r in df]), 3),
            "human_gpt4_corr": round(pearson([(r["ai_exposure_llm_human"], r["ai_exposure_llm_gpt4"]) for r in df]), 3),
            "human_gpt4_ci": list(r_ci(
                pearson([(r["ai_exposure_llm_human"], r["ai_exposure_llm_gpt4"]) for r in df]),
                len(df))),
            "originality_exposure": W["Originality"],
            "negative_abilities": [a for a in abilities if W[a] < 0],
            "most_exposed_ability": max(abilities, key=lambda a: W[a]),
            "most_exposed_ability_score": max(W.values()),
            "high_n": len(high),
            "high_growing": growing,
            "high_declining": sum(1 for r in high if r["projected_growth_pct_2024_2034"] < 0),
        },
        "bands": bands,
        "education": education,
        "abilities": [{"ability": r["cognitive_ability"], "family": r["cognitive_family"],
                       "exposure": r["ai_exposure_score"]}
                      for r in sorted(ab, key=lambda z: -z["ai_exposure_score"])],
        "subject_profile": profile,
        "residuals": {
            "over": [{"title": x["title"], "fit": round(x["fit"], 3), "actual": x["act"],
                      "residual": round(x["res"], 3), "z": round(x["z"], 2)} for x in by_res[:8]],
            "under": [{"title": x["title"], "fit": round(x["fit"], 3), "actual": x["act"],
                       "residual": round(x["res"], 3), "z": round(x["z"], 2)} for x in by_res[-8:]],
        },
        "extremes": {
            "most": [{"title": r["occupation_title"], "exposure": r["ai_exposure_llm_human"],
                      "wage": int(r["median_annual_wage_usd"])} for r in rank_exp[:6]],
            "least": [{"title": r["occupation_title"], "exposure": r["ai_exposure_llm_human"],
                       "wage": int(r["median_annual_wage_usd"])} for r in rank_exp[-6:]],
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"wrote {OUT}  ({OUT.stat().st_size:,} bytes)")
    print(f"  occupations       {len(df)}")
    print(f"  employment        {int(total_emp):,}")
    print(f"  plotted dots      {data['opening']['dots']:,}")
    print(f"  layers agree      r = {r_layers:+.3f}")
    print(f"  subject residual  {subj_res['res']:+.3f} ({subj_res['z']:+.2f} SD), rank {by_res.index(subj_res)+1}/{len(rows)}")
    rb = robustness
    print(f"  layers r          {rb['layers_r']:+.4f}  95% CI "
          f"[{rb['layers_r_ci'][0]:+.3f}, {rb['layers_r_ci'][1]:+.3f}]  "
          f"spearman {rb['layers_spearman']:+.4f}")
    print(f"  ROBUSTNESS        residual rank {rb['subject']['shipped_rank']} shipped vs "
          f"{rb['subject']['ols_rank']} under OLS (slope {rb['ols_slope']:+.2f})"
          f" -> scale-dependent: {rb['residual_rank_is_scale_dependent']}")
    print(f"  scale-free claim  displacement {rb['subject']['move']:+d} places, "
          f"rank {rb['subject']['move_rank']}/{len(rows)}")


if __name__ == "__main__":
    main()
