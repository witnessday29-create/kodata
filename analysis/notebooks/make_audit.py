"""Generate audit.ipynb — with real outputs, without Jupyter installed.

The notebook is an *independent re-derivation*, not a copy of the pipelines. A
notebook that restated build.py would be a second source of truth and would
drift from the first. This one instead:

  * reads the raw Kaggle files and the committed data.json
  * recomputes every published claim from scratch, in pandas
  * asserts each recomputation matches what the site publishes

The pipelines are stdlib; this is pandas. Agreement therefore means a result is
not an artefact of one implementation, which is the point of shipping it.

Cells are executed here in one shared namespace and their stdout captured, so
the outputs committed to the notebook are genuine. GitHub renders .ipynb, so the
whole audit is readable in the browser without running anything.

    python analysis/notebooks/make_audit.py
"""
import io
import json
import sys
import traceback
from contextlib import redirect_stdout
from pathlib import Path

# see the same note in analysis/verify.py — a piped stdout on Windows is cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parent
OUT = HERE / "audit.ipynb"
# a small summary the site reads, so the page never restates a count by hand
SUMMARY = HERE.parents[1] / "web" / "content" / "audit.json"

CELLS = [
    ("md", """# Auditing kodata

Every number published on [kodata](../../README.md) is re-derived here from the
raw source, independently of the pipelines that produced it.

**Why this exists.** The site claims that its figures are traceable. A pipeline
that emits its own numbers cannot establish that on its own — it can only be
self-consistent. So this notebook reads the *raw Kaggle files* and the
*committed `data.json`*, recomputes each published claim from scratch, and
asserts the two agree.

**Why pandas.** The pipelines are stdlib-only. This notebook is pandas and
numpy. Where they agree, the result is not an artefact of one implementation.

Nothing here imports `build.py`.
"""),

    ("code", '''import json, math
from pathlib import Path
import numpy as np
import pandas as pd
import kagglehub

ROOT = Path.cwd()
while not (ROOT / "web" / "content").exists() and ROOT != ROOT.parent:
    ROOT = ROOT.parent

# what the site publishes
P1 = json.loads((ROOT / "web/content/01-ai-exposure/data.json").read_text(encoding="utf-8"))
P2 = json.loads((ROOT / "web/content/02-screen-time/data.json").read_text(encoding="utf-8"))

# the raw source, fetched the same way the pipelines fetch it
b1 = kagglehub.dataset_download("kylefengkfeng209/will-ai-take-my-job-exposure-skills-and-wages")
b2 = kagglehub.dataset_download("kylefengkfeng209/screen-time-vs-mental-health-ml-ready")

jobs   = pd.read_csv(f"{b1}/ai_job_exposure.csv")
prof   = pd.read_csv(f"{b1}/occupation_cognitive_profile.csv")
abil   = pd.read_csv(f"{b1}/cognitive_ability_ai_exposure.csv")
teens  = pd.read_csv(f"{b2}/screen_time_mental_health.csv")
items  = pd.read_csv(f"{b2}/bdi_and_screen_items.csv")

CHECKS = []
def check(label, got, want, tol=5e-4):
    ok = (abs(got - want) <= tol) if isinstance(want, (int, float)) else (got == want)
    CHECKS.append((label, got, want, ok))
    print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print(f"      recomputed {got!r}   published {want!r}")
    assert ok, label

print(f"pandas {pd.__version__}, numpy {np.__version__}")
print(f"jobs {jobs.shape}  profiles {prof.shape}  abilities {abil.shape}")
print(f"teenagers {teens.shape}  items {items.shape}")'''),

    ("md", """---
## Piece 01 — *What Makes Writing Writing*

### Claim 1. The dataset scores AI exposure twice, and the two disagree

Exposure is scored per cognitive ability and per occupation. Build the
per-occupation prediction from the abilities each job demands, then correlate it
against the rating the dataset publishes for that job.
"""),

    ("code", '''ability_cols = [c for c in prof.columns if c not in ("soc_code", "occupation_title")]
W = abil.set_index("cognitive_ability")["ai_exposure_score"]
assert set(ability_cols) == set(W.index), "ability names differ between files"

lv = prof.set_index("soc_code")[ability_cols].dropna()
# weighted mean of ability exposure, weighted by how strongly the job needs each
pred = (lv * W[ability_cols]).sum(axis=1) / lv.sum(axis=1)

d = jobs.set_index("soc_code").join(pred.rename("pred"), how="inner").dropna(subset=["pred"])
r_layers = d["pred"].corr(d["ai_exposure_llm_human"])

print(f"n = {len(d)}")
check("piece 01 · the two layers correlate", round(float(r_layers), 4), P1["robustness"]["layers_r"])
check("piece 01 · shared variance", round(float(r_layers) ** 2, 3), P1["findings"]["layers_r2"])

# Fisher z interval, independently
z, se = math.atanh(r_layers), 1 / math.sqrt(len(d) - 3)
lo, hi = math.tanh(z - 1.96 * se), math.tanh(z + 1.96 * se)
check("piece 01 · CI low", round(lo, 4), P1["robustness"]["layers_r_ci"][0])
check("piece 01 · CI high", round(hi, 4), P1["robustness"]["layers_r_ci"][1])'''),

    ("md", """### Claim 2. Writing moves further between the two orderings than any other job

This is the claim the piece leads with, because it needs no scaling: it compares
two rank orders and never touches a unit.
"""),

    ("code", '''d = d.assign(
    pr=d["pred"].rank(ascending=False, method="first").astype(int),
    ar=d["ai_exposure_llm_human"].rank(ascending=False, method="first").astype(int),
)
d["move"] = d["pr"] - d["ar"]
subj = d[d["occupation_title"] == "Writers and authors"].iloc[0]

check("piece 01 · predicted rank", int(subj["pr"]), P1["subject"]["rank_predicted"])
check("piece 01 · rated rank", int(subj["ar"]), P1["subject"]["rank_actual"])
check("piece 01 · displacement", int(subj["move"]), P1["robustness"]["subject"]["move"])
check("piece 01 · largest displacement of all",
      int(d["move"].rank(ascending=False, method="first")[subj.name]),
      P1["robustness"]["subject"]["move_rank"])

print()
print(d.nlargest(5, "move")[["occupation_title", "pr", "ar", "move"]].to_string(index=False))'''),

    ("md", """### Claim 3. The residual ranking is *not* robust — and the site says so

The piece publishes an audit of its own weakest claim: under the shipped
rescaling writing is the largest residual of 271, but under ordinary least
squares it is seventeenth. Both are recomputed here, because a site that admits
a weakness should let you verify the admission.
"""),

    ("code", '''pm, ps = d["pred"].mean(), d["pred"].std(ddof=0)
am, asd = d["ai_exposure_llm_human"].mean(), d["ai_exposure_llm_human"].std(ddof=0)

# shipped: standardise the prediction onto the rating's mean and spread
fit_shipped = (d["pred"] - pm) / ps * asd + am
res_shipped = d["ai_exposure_llm_human"] - fit_shipped

# textbook: least squares. Because the layers correlate negatively this slopes DOWN.
slope = np.polyfit(d["pred"], d["ai_exposure_llm_human"], 1)[0]
res_ols = d["ai_exposure_llm_human"] - (am + slope * (d["pred"] - pm))

rank_shipped = int(res_shipped.rank(ascending=False, method="first")[subj.name])
rank_ols = int(res_ols.rank(ascending=False, method="first")[subj.name])

check("piece 01 · OLS slope is negative", round(float(slope), 4), P1["robustness"]["ols_slope"])
check("piece 01 · residual rank, shipped", rank_shipped, P1["robustness"]["subject"]["shipped_rank"])
check("piece 01 · residual rank, OLS", rank_ols, P1["robustness"]["subject"]["ols_rank"])
check("piece 01 · admits scale dependence", rank_shipped != rank_ols,
      P1["robustness"]["residual_rank_is_scale_dependent"])

print()
print("So: the correlation and the displacement hold under either method.")
print("The residual ranking does not, which is why the piece no longer leads with it.")'''),

    ("md", """### Claim 4. Exactly one of the 21 abilities scores negative
"""),

    ("code", '''neg = abil[abil["ai_exposure_score"] < 0]
check("piece 01 · one negative ability", len(neg), 1)
check("piece 01 · it is Originality", neg.iloc[0]["cognitive_ability"], "Originality")
check("piece 01 · its score", round(float(neg.iloc[0]["ai_exposure_score"]), 3),
      P1["findings"]["originality_exposure"])

# the subject's percentile on it, among all occupations
col = "Originality"
vals = prof[col].dropna()
mine = prof.loc[prof["occupation_title"] == "Writers and authors", col].iloc[0]
pct = 100 * (vals < mine).sum() / len(vals)
published = next(p["percentile"] for p in P1["subject_profile"] if p["ability"] == col)
check("piece 01 · writers' percentile on Originality", round(float(pct), 1), published)

print()
print(abil.nlargest(3, "ai_exposure_score")[["cognitive_ability", "ai_exposure_score"]].to_string(index=False))
print(abil.nsmallest(3, "ai_exposure_score")[["cognitive_ability", "ai_exposure_score"]].to_string(index=False))'''),

    ("md", """---
## Piece 02 — *The Line Someone Drew*

### Claim 1. The screen-time association is real, precise, and tiny — and sleep is eight times larger
"""),

    ("code", '''r_screen = teens["screen_time_index"].corr(teens["bdi_total"])
r_sleepq = teens["sleep_quality_index"].corr(teens["bdi_total"])

check("piece 02 · screen r", round(float(r_screen), 4), P2["headline"]["screen_r"])
check("piece 02 · screen r2 %", round(100 * float(r_screen) ** 2, 1), P2["headline"]["screen_r2_pct"])
check("piece 02 · sleep quality r2 %", round(100 * float(r_sleepq) ** 2, 1), P2["headline"]["sleepq_r2_pct"])
check("piece 02 · variance ratio", round(float(r_sleepq ** 2 / r_screen ** 2), 1),
      P2["headline"]["variance_ratio"], tol=0.06)

# Spearman, because the screen index is ordinal. Done by its definition —
# rank, then Pearson — rather than via pandas' method="spearman", which reaches
# for scipy. Keeps this notebook to pandas + numpy.
rho = teens["screen_time_index"].rank().corr(teens["bdi_total"].rank())
check("piece 02 · spearman", round(float(rho), 4), P2["robustness"]["screen"]["spearman"])

# how much of it travels with hours slept
rxz = teens["screen_time_index"].corr(teens["avg_sleep_hours"])
rzy = teens["avg_sleep_hours"].corr(teens["bdi_total"])
part = (r_screen - rxz * rzy) / math.sqrt((1 - rxz ** 2) * (1 - rzy ** 2))
absorbed = 100 * (1 - abs(part) / abs(r_screen))
pub = next(p for p in P2["partials"] if p["control"] == "avg_sleep_hours")
check("piece 02 · absorbed by hours slept, %", round(float(absorbed), 1), pub["absorbed_pct"], tol=0.06)'''),

    ("md", """### Claim 2. The file's own `depressed` column is a line at 14

The source ships a yes/no flag without saying what produced it. Search for it
rather than assume.
"""),

    ("code", '''found = [(c, float(((teens["bdi_total"] >= c).astype(float) == teens["depressed"]).mean()))
         for c in range(5, 31)]
exact = [c for c, a in found if a == 1.0]
runner = max((t for t in found if t[1] < 1.0), key=lambda t: t[1])

check("piece 02 · exactly one cutoff reproduces the column", len(exact), 1)
check("piece 02 · and it is", exact[0], P2["headline"]["cutoff_verified"])
check("piece 02 · next best cutoff", runner[0], P2["headline"]["cutoff_runner_up"])
check("piece 02 · next best agreement", round(runner[1], 4), P2["headline"]["cutoff_runner_up_agreement"])
print()
print("Nothing in the data forces 14. It is a line somebody drew.")'''),

    ("md", """### Claim 3. The same teenagers support 130 different headlines, 38 of them indistinguishable from nothing

Two thresholds have to be chosen before *&ldquo;N times more likely to be
depressed&rdquo;* can be written. Every combination is recomputed here, with a
Katz interval on each.
"""),

    ("code", '''rows = []
for k in P2["grid"]["thresholds"]:
    heavy = teens[teens["screen_time_index"] >= k]
    light = teens[teens["screen_time_index"] < k]
    for cut in P2["grid"]["cutoffs"]:
        a = int((heavy["bdi_total"] >= cut).sum()); n1 = len(heavy)
        c = int((light["bdi_total"] >= cut).sum()); n0 = len(light)
        rr = (a / n1) / (c / n0)
        se = math.sqrt(1 / a - 1 / n1 + 1 / c - 1 / n0)
        rows.append({"k": k, "cut": cut, "rr": rr,
                     "lo": math.exp(math.log(rr) - 1.96 * se),
                     "solid": math.exp(math.log(rr) - 1.96 * se) > 1})
grid = pd.DataFrame(rows)

check("piece 02 · grid size", len(grid), P2["robustness"]["grid_cells"])
check("piece 02 · lowest ratio", round(float(grid["rr"].min()), 3), P2["grid"]["rr_min"])
check("piece 02 · highest ratio", round(float(grid["rr"].max()), 3), P2["grid"]["rr_max"])
check("piece 02 · intervals clear of 1", int(grid["solid"].sum()), P2["robustness"]["grid_solid"])

print()
print(f"{int((~grid['solid']).sum())} of {len(grid)} are quotable point estimates whose")
print("interval includes 1 — arithmetically true, statistically indistinguishable")
print("from no difference at all.")'''),

    ("md", """### Claim 4. The flat per-item loading says nothing about screens

The piece originally read screen time's even spread across the 21 questionnaire
items as evidence against a mechanism. Running the same breakdown for sleep
killed that inference, and the withdrawal is published. Verify it.
"""),

    ("code", '''by_id = items.set_index("subject_id")
merged = teens.set_index("subject_id").join(by_id, rsuffix="_it")
item_cols = [f"bdi_item_{i:02d}" for i in range(1, 22)]

def spread(col):
    rs = np.array([merged[col].corr(merged[ic]) for ic in item_cols])
    return rs, rs.std(ddof=0) / abs(rs.mean())

_, s_screen = spread("screen_time_index")
_, s_sleep = spread("sleep_quality_index")

check("piece 02 · screen spread ÷ size", round(float(s_screen), 3), P2["flatness_audit"]["screen_spread"])
check("piece 02 · sleep spread ÷ size", round(float(s_sleep), 3), P2["flatness_audit"]["sleep_spread"])
check("piece 02 · sleep is at least as flat", bool(s_sleep <= s_screen), True)

print()
for col in ["screen_time_index", "sleep_quality_index", "avg_sleep_hours",
            "midsleep_weekend_hours", "social_jetlag_hours"]:
    rs, sp = spread(col)
    print(f"  {col:24s} mean {rs.mean():+.4f}  spread÷size {sp:.3f}  "
          f"strongest item {int(np.argmax(np.abs(rs))) + 1:02d}")
print()
print("Sleep has eight times the explanatory power and an obvious mechanism, and")
print("its profile is if anything MORE uniform. Flatness is a property of this")
print("questionnaire, not a finding about screens.")'''),

    ("md", """---
## Result
"""),

    ("code", '''summary = pd.DataFrame(CHECKS, columns=["claim", "recomputed", "published", "ok"])
print(summary.to_string(index=False))
print()
print(f"{int(summary['ok'].sum())} of {len(summary)} published claims re-derived "
      f"independently, in pandas, from the raw source.")
print()
print("The pipelines are stdlib and this notebook is not, so where the two agree")
print("the number is not an artefact of either. Where the site admits a weakness")
print("— the scale-dependent residual, the withdrawn flatness inference — the")
print("admission checks out too.")
assert summary["ok"].all()'''),
]


def run():
    ns = {"__name__": "__main__"}
    cells = []
    failed = False

    for kind, src in CELLS:
        if kind == "md":
            cells.append({"cell_type": "markdown", "metadata": {},
                          "source": src.splitlines(keepends=True)})
            continue

        buf = io.StringIO()
        err = None
        try:
            with redirect_stdout(buf):
                exec(compile(src, "<cell>", "exec"), ns)
        except Exception:
            err = traceback.format_exc()
            failed = True

        outputs = []
        text = buf.getvalue()
        if text:
            outputs.append({"output_type": "stream", "name": "stdout",
                            "text": text.splitlines(keepends=True)})
        if err:
            outputs.append({"output_type": "stream", "name": "stderr",
                            "text": err.splitlines(keepends=True)})
            print(err, file=sys.stderr)

        cells.append({
            "cell_type": "code",
            "execution_count": sum(1 for c in cells if c["cell_type"] == "code") + 1,
            "metadata": {},
            "outputs": outputs,
            "source": src.splitlines(keepends=True),
        })
        print(f"  cell {len(cells):2d}  {'ERROR' if err else 'ok'}  "
              f"{len(text.splitlines())} lines out")

    nb = {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": sys.version.split()[0]},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }
    OUT.write_text(json.dumps(nb, indent=1), encoding="utf-8")
    print(f"\nwrote {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")

    checks = ns.get("CHECKS", [])

    # The notebook lives in analysis/, which a static site cannot serve, and
    # linking to GitHub would only work while the repo is public. So the cells
    # are emitted here in render-ready form and the site displays them itself.
    # The audit is then readable inside the thing it audits, with no external
    # dependency and no second copy of the file.
    render = []
    for c in cells:
        src = "".join(c["source"])
        if c["cell_type"] == "markdown":
            render.append({"kind": "md", "text": src})
        else:
            render.append({
                "kind": "code",
                "text": src,
                "out": "".join("".join(o.get("text", [])) for o in c["outputs"]),
            })

    SUMMARY.write_text(json.dumps({
        "notebook": "analysis/notebooks/audit.ipynb",
        "generator": "analysis/notebooks/make_audit.py",
        "checks": len(checks),
        "passed": sum(1 for c in checks if c[3]),
        "failed": [c[0] for c in checks if not c[3]],
        "cell_count": len(cells),
        "stack": "pandas + numpy only, no scipy",
        # the pipelines are stdlib; agreement across two implementations is the
        # whole reason this artefact exists
        "independent_of_pipeline": True,
        "cells": render,
    }, indent=1), encoding="utf-8")
    print(f"wrote {SUMMARY}  ({len(checks)} checks, "
          f"{sum(1 for c in checks if c[3])} passed, {len(render)} cells rendered)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(run())
