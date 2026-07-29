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
  verify.py                             re-runs both, refuses to publish drift
web/
  content/01-ai-exposure/data.json      computed — never edit by hand
  content/02-screen-time/data.json      computed — never edit by hand
  content/site.json                     written — this one is yours to edit
  app/, components/, lib/               Next.js, static export
```

## Running it

```bash
# the analysis (stdlib only, no pandas; kagglehub fetches the data)
python analysis/pipelines/01_ai_exposure/build.py
python analysis/pipelines/02_screen_time/build.py

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
assertion failed). Run it as a pull-request gate and drift gets caught without
being published.

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
