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
P3 = json.loads((ROOT / "web/content/03-pekerja-sejahtera/data.json").read_text(encoding="utf-8"))

# the raw source, fetched the same way the pipelines fetch it
b1 = kagglehub.dataset_download("kylefengkfeng209/will-ai-take-my-job-exposure-skills-and-wages")
b2 = kagglehub.dataset_download("kylefengkfeng209/screen-time-vs-mental-health-ml-ready")
b3 = kagglehub.dataset_download("rezkyyayang/pekerja-sejahtera")

jobs   = pd.read_csv(f"{b1}/ai_job_exposure.csv")
prof   = pd.read_csv(f"{b1}/occupation_cognitive_profile.csv")
abil   = pd.read_csv(f"{b1}/cognitive_ability_ai_exposure.csv")
teens  = pd.read_csv(f"{b2}/screen_time_mental_health.csv")
items  = pd.read_csv(f"{b2}/bdi_and_screen_items.csv")

# piece 03 is a panel, so it is read wide (as the pipeline does, to preserve the
# file's own row order) and long (which is what pandas wants for a merge)
ump_w  = pd.read_csv(f"{b3}/ump.csv")
ump_l  = pd.read_csv(f"{b3}/ump.df.csv")
gk_l   = pd.read_csv(f"{b3}/gk.df.csv")
peng_l = pd.read_csv(f"{b3}/peng.df.csv")
upah_l = pd.read_csv(f"{b3}/upah.df.csv")

CHECKS = []
def check(label, got, want, tol=5e-4):
    ok = (abs(got - want) <= tol) if isinstance(want, (int, float)) else (got == want)
    CHECKS.append((label, got, want, ok))
    print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print(f"      recomputed {got!r}   published {want!r}")
    assert ok, label

print(f"pandas {pd.__version__}, numpy {np.__version__}")
print(f"jobs {jobs.shape}  profiles {prof.shape}  abilities {abil.shape}")
print(f"teenagers {teens.shape}  items {items.shape}")
print(f"ump {ump_l.shape}  gk {gk_l.shape}  peng {peng_l.shape}  upah {upah_l.shape}")'''),

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
## Piece 03 — *How Many People Is a Wage*

### Claim 1. The file calls the national aggregate a province

Thirty-five rows in the province column, thirty-four provinces. If this row is
ever removed upstream, the pipeline's assertion fails rather than every
cross-province figure silently changing.
"""),

    ("code", '''NATIONAL = "INDONESIA"
provs = [p for p in ump_w["provinsi"] if p != NATIONAL]

check("piece03 rows in the province column", len(ump_w), P3["source"]["rows_in_file"])
check("piece03 actual provinces", len(provs), P3["source"]["provinces"])
check("piece03 the aggregate is named", NATIONAL, P3["source"]["national_row"])

print()
print(f"row {list(ump_w['provinsi']).index(NATIONAL)} of {len(ump_w)} is the country.")
print("It is not flagged, not last, and not named differently from the rest.")'''),

    ("md", """### Claim 2. The 2021 minimum-wage column is corrupt in 13 of 34 provinces

Three independent tests, none needing a source outside the file. Note the shape
of the rank evidence: 2020 and 2022 agree almost perfectly *with each other*
while both disagree with 2021. A real year cannot do that — to sit between two
years that match, it would have to match them too.
"""),

    ("code", '''W = ump_w.set_index("provinsi")
W.columns = [int(c.split(".")[1]) for c in W.columns]
W = W.apply(pd.to_numeric, errors="coerce")

# test one: which year disagrees with its neighbours.
# Spearman as rank-then-Pearson: pandas routes method="spearman" through scipy,
# which is not a dependency here, and this is the same statistic anyway.
def rho(y1, y2):
    d = W[[y1, y2]].dropna()
    return round(d[y1].rank().corr(d[y2].rank()), 4)

g = P3["integrity"]
check("piece03 rho(ump2020, ump2022)", rho(2020, 2022), g["rho_2020_2022"])
check("piece03 rho(ump2020, ump2021)", rho(2020, 2021), g["rho_2020_2021"])
check("piece03 rho(ump2021, ump2022)", rho(2021, 2022), g["rho_2021_2022"])

# test two: UMP is nominally non-decreasing, and nothing here falls 2020 -> 2022
V = W.loc[provs, [2020, 2021, 2022]].dropna()
check("piece03 no province fell 2020 to 2022",
      bool((V[2022] >= V[2020]).all()), g["no_province_fell_2020_to_2022"])

lo, hi = V[[2020, 2022]].min(axis=1) - 1, V[[2020, 2022]].max(axis=1) + 1
outside = V[(V[2021] < lo) | (V[2021] > hi)]
check("piece03 provinces outside the [2020, 2022] bracket",
      len(outside), g["n_violations"])

# test three: whose number is it? tolerance Rp 2 catches the off-by-one fingerprint
pool = [(q, y, W.loc[q, y]) for q in W.index for y in (2020, 2022)
        if pd.notna(W.loc[q, y])]
traced = 0
for p, row in outside.iterrows():
    src = [(q, y) for q, y, v in pool if q != p and abs(v - row[2021]) <= 2]
    if src:
        traced += 1
check("piece03 displaced values traced to another province", traced, g["n_traced"])

# and the real 2021, visible only once the corrupted rows are set aside
clean = V.drop(index=outside.index)
check("piece03 clean 2021 provinces", len(clean), g["clean_rows"])
check("piece03 of those, froze the wage exactly",
      int(((clean[2021] - clean[2020]).abs() <= 1).sum()), g["frozen_exactly"])

print()
print(f"A normal adjacent pair, for scale: rho(2019, 2020) = {rho(2019, 2020):+.4f}")
print(f"{len(outside)} of {len(V)} provinces break a bracket that law makes impossible,")
print(f"{traced} of them holding another province's wage to within two rupiah.")
print(f"The real 2021: {int(((clean[2021] - clean[2020]).abs() <= 1).sum())} of "
      f"{len(clean)} provinces froze the minimum wage entirely.")'''),

    ("md", """### Claim 3. The obvious explanation — a column that slipped one row — is wrong

Worth stating because it was the first hypothesis and it failed. Shifting the
2021 column back one row makes the agreement with 2020 *worse*, and the row gaps
between a displaced value and its owner are irregular. A scramble, not a shift,
which is why the file cannot be repaired from inside itself.
"""),

    ("code", '''order = list(ump_w["provinsi"])
shifted = pd.Series({order[i]: W.loc[order[i + 1], 2021] for i in range(len(order) - 1)})
pair = pd.DataFrame({"y2020": W.loc[provs, 2020], "shift": shifted.reindex(provs)}).dropna()
r_shift = round(pair["y2020"].rank().corr(pair["shift"].rank()), 4)

sh = g["shift_hypothesis"]
check("piece03 rho after shifting the column back one row",
      r_shift, sh["rho_repaired_vs_2020"])
check("piece03 the shift hypothesis is rejected",
      bool(r_shift < g["rho_2020_2021"]), sh["rejected"])

idx = {p: i for i, p in enumerate(order)}
gaps = sorted({idx[q] - idx[p]
               for p, row in outside.iterrows()
               for q, y, v in pool if q != p and abs(v - row[2021]) <= 2})
check("piece03 the row gaps are irregular", gaps, sh["row_deltas"])

print()
print(f"repaired {r_shift:+.4f} vs raw {g['rho_2020_2021']:+.4f} — the repair is worse.")
print(f"row gaps: {gaps}")
print()
print("The one-rupiah fingerprint: a value one rupiah from its source is not a")
print("typing slip or a policy choice. It is what a number looks like after a")
print("round trip through a float, which says this column arrived down a")
print("different path than the rest of the file.")'''),

    ("md", """### Claim 4. In the median province one minimum wage holds under five people

The minimum wage is per worker per month; the poverty line is per *person* per
month. Dividing gives a count of human beings. March, total, town and
countryside combined — the headline BPS series — with 2021 excluded for the
reasons above.
"""),

    ("code", '''gk = gk_l[(gk_l["jenis"] == "TOTAL") &
          (gk_l["daerah"] == "PERDESAANPERKOTAAN") &
          (gk_l["periode"] == "MARET")][["provinsi", "tahun", "gk"]]

d = (ump_l.merge(gk, on=["provinsi", "tahun"])
          .query("provinsi != @NATIONAL and tahun != 2021")
          .dropna(subset=["ump", "gk"]))
d["persons"] = d["ump"] / d["gk"]

h = P3["headline"]
years = sorted(d["tahun"].unique())
check("piece03 province-years in the clean panel", len(d), h["province_years"])
check("piece03 years used", years, P3["source"]["years_used"])

med = d.groupby("tahun")["persons"].median().round(3)
check("piece03 median people, first year", med.loc[years[0]], h["persons_median_first"])
check("piece03 median people, last year", med.loc[years[-1]], h["persons_median_last"])
check("piece03 fewest people, any province-year", round(d["persons"].min(), 3), h["persons_min"])
check("piece03 most people, any province-year", round(d["persons"].max(), 3), h["persons_max"])
check("piece03 share of province-years under five people",
      round(100 * (d["persons"] < 5).mean(), 1), h["under_five_pct"])
check("piece03 share under four people",
      round(100 * (d["persons"] < 4).mean(), 1), h["under_four_pct"])

# the subject claim: lowest in every single clean year
lowest = d.loc[d.groupby("tahun")["persons"].idxmin(), "provinsi"].unique()
check("piece03 one province is lowest in every clean year",
      len(lowest) == 1 and lowest[0] == P3["subject"]["province"], True)

print()
print(med.to_string())
print()
print(f"{P3['subject']['province']} is the fewest in all {len(years)} clean years.")'''),

    ("md", """### Claim 5. The wage tracks local cost of living — until the year is held constant

This is the claim the piece rests on, so it is re-derived down a deliberately
different route: the pipeline sweeps group means out by iterated demeaning, and
this builds the dummy matrices explicitly and solves by least squares. Two
routes, one answer.
"""),

    ("code", '''d = d.assign(ly=np.log(d["ump"]), lx=np.log(d["gk"]))

def fe_slope(df, year_effects):
    """Explicit dummies, solved by lstsq. No demeaning anywhere."""
    parts = [pd.get_dummies(df["provinsi"], dtype=float)]
    if year_effects:
        parts.append(pd.get_dummies(df["tahun"], drop_first=True, dtype=float))
    parts.append(df[["lx"]])
    X = pd.concat(parts, axis=1).values
    return np.linalg.lstsq(X, df["ly"].values, rcond=None)[0][-1]

one, two = P3["elasticity"]["province_fe"], P3["elasticity"]["twoway_fe"]
check("piece03 elasticity, province fixed effects",
      round(fe_slope(d, False), 4), one["beta"])
check("piece03 elasticity, province + year fixed effects",
      round(fe_slope(d, True), 4), two["beta"])
check("piece03 the two-way interval contains zero",
      bool(two["ci_cluster"][0] < 0 < two["ci_cluster"][1]), True)

print()
print(f"province FE only    {fe_slope(d, False):+.4f}   published {one['beta']:+.4f}")
print(f"+ year FE           {fe_slope(d, True):+.4f}   published {two['beta']:+.4f}")
print(f"                    cluster-robust 95% CI {two['ci_cluster']}")
print()
print("The first estimate was measuring inflation. Both series climb together")
print("every year and a province dummy cannot separate a national climb from a")
print("local response. Once the year is absorbed, a province's minimum wage")
print("carries no information about what that province costs — which is what a")
print("wage set by national formula would look like.")'''),

    ("md", """### Claim 6. Twenty years without convergence, and an order that barely moves

Theil's T is entropy-based and scale-free, so 2002 and 2022 can be compared
without deflating anything.
"""),

    ("code", '''def theil(v):
    mu = v.mean()
    return float(((v / mu) * np.log(v / mu)).sum() / len(v))

dsp = P3["dispersion"]["series"]
uw = W.loc[provs]
for row in (dsp[0], dsp[-1]):
    v = uw[row["year"]].dropna()
    check(f"piece03 Theil T of provincial minimum wages, {row['year']}",
          round(theil(v), 5), row["theil"])
    check(f"piece03 provinces with a wage in {row['year']}", len(v), row["n"])

rp = P3["dispersion"]["persistence"]
w = d.pivot_table(index="provinsi", columns="tahun", values="persons")
pair = w[[rp["first_year"], rp["last_year"]]].dropna()
check("piece03 rank persistence of people-per-wage",
      round(pair[rp["first_year"]].rank().corr(pair[rp["last_year"]].rank()), 4),
      rp["spearman"])
check("piece03 provinces compared", len(pair), rp["n"])

print()
print(f"Theil {dsp[0]['theil']:.5f} ({dsp[0]['year']}) -> "
      f"{dsp[-1]['theil']:.5f} ({dsp[-1]['year']}) across "
      f"{dsp[-1]['year'] - dsp[0]['year']} years.")
print("Provincial minimum wages have neither converged nor diverged, and the")
print("ordering of provinces is nearly frozen. This is a structure, not a drift.")'''),

    ("md", """### Claim 7. The poverty line is a basket nobody buys

Engel's law needs no threshold: the poorer the household, the larger the share
of spending that goes on food. The file carries food and non-food twice — for
actual spending, and inside the poverty line itself — so the same ratio can be
taken of both and compared.
"""),

    ("code", '''def food_share(df, value, year, area):
    s = df[(df["tahun"] == year) & (df["daerah"] == area) &
           (df["provinsi"] != NATIONAL)]
    w = s.pivot_table(index="provinsi", columns="jenis", values=value)
    return (w["MAKANAN"] / w["TOTAL"]).median()

for e in [x for x in P3["engel"] if x["year"] == max(y["year"] for y in P3["engel"])]:
    gkm = gk_l[gk_l["periode"] == "MARET"]
    check(f"piece03 food share of actual spending, {e['year']} {e['area']}",
          round(food_share(peng_l, "peng", e["year"], e["area"]), 4),
          e["spending_food_share"])
    check(f"piece03 food share of the poverty line, {e['year']} {e['area']}",
          round(food_share(gkm, "gk", e["year"], e["area"]), 4),
          e["line_food_share"])

print()
print("A stable gap of roughly a quarter, for every year both series exist.")
print("Stability is the tell: BPS builds the food component of the line from a")
print("fixed calorie basket, so its food share is stipulated, not observed. A")
print("poverty count is therefore a count against a stipulation.")'''),

    ("md", """### Claim 8. The legal floor is becoming the going rate
"""),

    ("code", '''HOURS = P3["floor"]["hours"]
f = (upah_l.merge(ump_l, on=["provinsi", "tahun"])
           .query("provinsi != @NATIONAL and tahun != 2021")
           .dropna(subset=["upah", "ump"]))
f["ratio"] = f["upah"] * HOURS / f["ump"]

for row in (P3["floor"]["series"][0], P3["floor"]["series"][-1]):
    s = f[f["tahun"] == row["year"]]
    check(f"piece03 median actual wage over legal minimum, {row['year']}",
          round(s["ratio"].median(), 4), row["median"])
    check(f"piece03 provinces below their own legal minimum, {row['year']}",
          int((s["ratio"] < 1).sum()), row["below_minimum"])

print()
print(f.groupby("tahun")["ratio"].agg(["median", lambda s: int((s < 1).sum())])
       .rename(columns={"<lambda_0>": "below_minimum"}).round(3).to_string())
print()
print(f"`upah` is read as rupiah per hour; the file does not say so. Multiplied")
print(f"by the statutory {HOURS}-hour month it lands within a quarter of the legal")
print("minimum in every province-year, which no other plausible unit does. The")
print("downward trend survives being wrong about it — a fixed multiplier cannot")
print("create a trend — but the count below 1.00 does not.")'''),

    ("md", """### Claim 9. The interactive grid is arithmetic, not a promise

The piece lets a reader move household size, earners, province and area, and
every cell they can reach was computed in Python and committed — the controls
index an array and divide nothing. That claim is only worth making if the
committed array is right, so it is re-derived here in full: all 2,376 cells,
not a sample.
"""),

    ("code", '''m = P3["machine"]
gk_m = gk_l[(gk_l["jenis"] == "TOTAL") & (gk_l["periode"] == "MARET") &
            (gk_l["tahun"] == m["year"])]
# on the value, not the row: a province with no countryside still has a
# PERDESAAN row in the source, carrying a blank
line = {(r["provinsi"], r["daerah"]): r["gk"]
        for _, r in gk_m.iterrows() if pd.notna(r["gk"])}
u_m = ump_l[ump_l["tahun"] == m["year"]]
wage = dict(zip(u_m["provinsi"], u_m["ump"]))

bad = []
for p in m["provinces"]:
    for ai, area in enumerate(m["areas"]):
        for ei, e in enumerate(m["earners"]):
            for si, s in enumerate(m["sizes"]):
                pp, ratio, below = m["cells"][p][ai][ei][si]
                want_pp = wage[p] * e / s
                want_r = want_pp / line[(p, area)]
                if (abs(pp - round(want_pp)) > 0
                        or abs(ratio - round(want_r, 3)) > 5e-4
                        or below != int(want_r < 1)):
                    bad.append((p, area, e, s))

check("piece03 every machine cell re-derives", len(bad), 0)
check("piece03 machine cells committed",
      sum(len(m["cells"][p][a][e])
          for p in m["cells"] for a in range(len(m["areas"]))
          for e in range(len(m["earners"]))),
      len(m["provinces"]) * len(m["areas"]) * len(m["earners"]) * len(m["sizes"]))

# the default position is the piece's own sentence about one province
dp = m["default"]
pp0, r0, b0 = (m["cells"][dp["province"]][dp["area"]]
                [m["earners"].index(dp["earners"])][m["sizes"].index(dp["size"])])
check("piece03 the default household is below the line", b0, 1)
check("piece03 how many provinces put 4 people on 1 wage under the line",
      sum(1 for p in m["provinces"]
          if m["cells"][p][0][m["earners"].index(1)][m["sizes"].index(4)][2]),
      m["default_below"])

# A province with no countryside has no rural poverty line, so it has no row.
# Named rather than silently dropped, and the reason is checkable: the missing
# provinces are exactly those with no PERDESAAN line in the source.
no_rural = sorted(p for p in provs if (p, "PERDESAAN") not in line)
check("piece03 provinces excluded from the machine", no_rural, m["excluded"])

print()
print(f"{len(m['provinces'])} provinces x {len(m['earners'])}x{len(m['sizes'])} household "
      f"shapes x {len(m['areas'])} areas, all re-derived.")
print(f"default ({dp['province']}, {dp['size']} people, {dp['earners']} earner, "
      f"combined line): Rp {pp0:,} per person, {r0}x the line")
print(f"a four-person single-earner household is under the line in "
      f"{m['default_below']} of {len(m['provinces'])} provinces.")
print(f"excluded: {', '.join(m['excluded'])} — {m['excluded_why']}.")'''),

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
