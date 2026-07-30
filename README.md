# kodata

Open data, followed all the way down to one person inside it.

A portfolio of data analysis and narrative writing. Each piece starts with a
public dataset and ends with a story. The numbers can be checked: every figure
set in mono on the site opens its own evidence in a column to the right, so a
reader never has to leave the sentence they are on to find out whether it is
true.

## The rule the whole thing rests on

**Python computes. The web layer only displays.**

Each piece has one pipeline that emits exactly one `data.json`, and that file is
the only contract between the analysis and the site. Nothing downstream
re-computes anything — not even the interactive parts. The sliders in piece 02
move through a grid of results that was calculated in Python and committed;
they index into an array rather than doing arithmetic in a browser. That is what
keeps every number on screen traceable to a source file.

```
analysis/
  pipelines/01_ai_exposure/build.py     271 occupations, AI exposure, wages
  pipelines/02_screen_time/build.py     4,810 teenagers, screens, sleep, BDI
  pipelines/03_pekerja_sejahtera/       34 provinces, minimum wage, poverty line
  verify.py                             re-runs all three, refuses to publish drift
  notebooks/audit.ipynb                 re-derives every claim, in pandas
  notebooks/make_audit.py               regenerates it with real outputs
web/
  content/01-ai-exposure/data.json      computed — never edit by hand
  content/02-screen-time/data.json      computed — never edit by hand
  content/03-pekerja-sejahtera/         computed — never edit by hand
  content/audit.json                    computed — the notebook's pass count
  content/site.json                     written — this one is yours to edit
  app/, components/, lib/               Next.js, static export
```

## Running it

```bash
# the analysis (stdlib only, no pandas; kagglehub fetches the data)
python analysis/pipelines/01_ai_exposure/build.py
python analysis/pipelines/02_screen_time/build.py
python analysis/pipelines/03_pekerja_sejahtera/build.py

# check the committed output still reproduces
python analysis/verify.py

# the site
cd web && npm install && npm run dev
```

There is no backend and no database. `next build` emits static files.

## Why the pipelines are not on a schedule

They must not be. The prose is written around specific findings — "not weak,
inverted", "the only negative one", two fables — and no automation can rewrite a
fable when a number moves. A scheduled job would publish new numbers underneath
old sentences, which is precisely the failure this project is built to avoid.

`verify.py` exists instead. It re-runs both pipelines, never writes to
`web/content`, and reports three failures apart: **drift** (the upstream dataset
changed), **tamper** (a `data.json` was hand-edited), and **break** (a pipeline
assertion failed). Drift gets caught without being published.

`.github/workflows/verify.yml` runs it on every pull request, in two jobs that
fail for different reasons. **site** needs no secrets: `next build` is a real
gate, because `app/page.tsx` calls `assertGraph()` at module scope — so a dead
deep link fails the build rather than shipping — and the export renders all 35
pane routes, so a pane that throws is caught. It then checks the prose is in the
HTML and that every page carries a share card. **data** re-runs the pipelines
against live Kaggle and diffs them against the commit; that needs
`KAGGLE_USERNAME` and `KAGGLE_KEY`, and skips itself when they are absent rather
than going red. Neither job is on a schedule, for the reason above; use
`workflow_dispatch` to check for drift on purpose.

## Checking the numbers without trusting the pipeline

`analysis/notebooks/audit.ipynb` re-derives every published figure from the raw
Kaggle files and asserts it matches the committed `data.json`. It deliberately
does not import `build.py`: the pipelines are stdlib, the notebook is pandas and
numpy, so where the two agree the number is not an artefact of either
implementation. **78 of 78 claims check out**, including the places the site
admits a weakness, and including all 2,376 cells behind piece 03's interactive —
re-derived in full rather than sampled, because "the browser divides nothing" is
only worth claiming if the committed array is right.

It has already earned its keep. Piece 03 published a threshold count computed
from ratios that had been rounded to three decimals first, which put a
province-year of 4.99998 on the wrong side of “under five people” and cost a
percentage point off a headline figure. The stdlib pipeline was self-consistent
and wrong; the pandas re-derivation disagreed, and the pipeline now compares
exact values and rounds only for display.

The outputs committed to it are real — `make_audit.py` executes each cell and
embeds what it actually printed. GitHub renders `.ipynb`, and the generator also
emits the cells into `web/content/audit.json` so **the site renders the whole
notebook inside the `audit.ipynb` pane**: a static export cannot serve an
`.ipynb`, and a GitHub link only resolves while the repo is public, so the audit
lives inside the thing it audits rather than being pointed at.

```bash
python analysis/notebooks/make_audit.py   # regenerates the notebook and audit.json
```

Two guards, different jobs. `verify.py` checks that the committed data still
comes out of the pipelines. `audit.ipynb` checks that the sentences still match
the data.

## On the analysis being wrong

Piece 01 publishes an audit of its own weakest claim. An earlier version led
with a residual ranking that put the subject first of 271; testing it against
ordinary least squares put it seventeenth instead. The claim was demoted, the
piece now leads with a scale-free measure, and the pipeline emits
`residual_rank_is_scale_dependent: true` so the page cannot overclaim by
accident.

Every piece carries a `method, robustness, and objections` block under each
finding, holding the intervals, the alternative tests, and what would break the
result.

## Editing the copy

`web/content/site.json` holds everything a human wrote and may want to change:
wordmark, email, hero text, availability, links, nav. Edit it — on github.com in
the browser is fine — commit, done. The `data.json` files beside it are computed
output; `verify.py` will catch a hand edit.

## Sources

- Will AI Take My Job? Exposure, Skills and Wages —
  `kylefengkfeng209/will-ai-take-my-job-exposure-skills-and-wages`
- Screen Time vs Mental Health (ML-ready) —
  `kylefengkfeng209/screen-time-vs-mental-health-ml-ready`

Both cross-sectional. Nothing in either piece claims a causal direction, and
each states its limits in full.
