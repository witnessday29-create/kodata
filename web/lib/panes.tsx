import { works, screenTime, site, audit, num, sign } from "@/lib/works";
import { Headline, Flatness } from "@/components/Headline";
import { Expert, CI, Check } from "@/components/Expert";
import { Intro } from "@/components/Intro";
import { Finder } from "@/components/Finder";
import { Notebook } from "@/components/Notebook";
import type { PaneDef } from "@/components/Stack";
import { Anno } from "@/components/Anno";
import { AbilityBars } from "@/components/AbilityBars";
import { SlopeGraph } from "@/components/SlopeGraph";

function Signature({ hist, mark }: { hist: number[]; mark: number }) {
  const max = Math.max(...hist);
  return (
    <span className="sig" aria-hidden>
      {hist.map((v, i) => (
        <i
          key={i}
          className={i === mark ? "mark" : undefined}
          style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}

function histogram(values: number[], bins = 56, max = 0.9) {
  const h = new Array(bins).fill(0);
  for (const v of values) h[Math.min(bins - 1, Math.floor((v / max) * bins))]++;
  return h;
}

/**
 * Copy authored in content/site.json and compiled in at build time.
 *
 * Not user input — it is a committed file only the repo owner can change — so a
 * little inline markup in it is allowed, which keeps emphasis available to
 * someone editing prose without touching TSX.
 */
function Copy({ html, className }: { html: string; className?: string }) {
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

const PIPELINE = `"""01 — Will AI take my job? Exposure, skills and wages.

Emits web/content/01-ai-exposure/data.json, the single
contract between this analysis and the web layer. Nothing
downstream re-computes anything.

stdlib only, on purpose: at n=271 pandas buys nothing, and
a pipeline with no third-party dependency beyond kagglehub
runs anywhere Python does.
"""
import csv, json, math, statistics as st

SUBJECT = "Writers and authors"

def pearson(pairs):
    x = [a for a, _ in pairs]
    y = [b for _, b in pairs]
    mx, my = st.mean(x), st.mean(y)
    num = sum((a - mx) * (b - my) for a, b in pairs)
    den = math.sqrt(sum((a - mx) ** 2 for a in x)
                    * sum((b - my) ** 2 for b in y))
    return num / den`;


/* Module scope: none of this depends on a request, so it is computed once
   at build time and shared by every route that renders a pane. */
const w = works["01-ai-exposure"];
const s = w.subject;
const f = w.findings;

const t = screenTime;
const th = t.headline;
const sleep = t.partials.find((p) => p.control === "avg_sleep_hours")!;
const exposures = w.opening.cloud.map((c) => c[0]);
const hist = histogram(exposures);
const mark = Math.min(55, Math.floor((s.exposure / 0.9) * 56));

export const panes: Record<string, PaneDef> = {
    /* ── the index ────────────────────────────────────────────────────── */
    index: {
      title: "index",
      node: (
        <>
          <Copy className="lede" html={site.index.lede} />
          <Copy className="txt dim" html={site.index.blurb} />

          {site.availability.show && (
            <p style={{ margin: "1.4rem 0 0" }}>
              <span className="pill">
                <s />
                {site.availability.label}
              </span>
            </p>
          )}

          <div className="ledger">
            <div>
              <b>02</b>
              <span>pieces</span>
            </div>
            <div>
              <b>02</b>
              <span>public datasets</span>
            </div>
            <div>
              <b>{num(w.source.occupations)}</b>
              <span>occupations</span>
            </div>
            <div>
              <b>{num(t.source.subjects)}</b>
              <span>teenagers</span>
            </div>
          </div>

          <p className="kicker">
            work <i />
          </p>
          <div className="rows">
            <button className="row" data-pane="piece-01" type="button" aria-label={w.title}>
              <span className="row-k">01</span>
              <span>
                <span className="row-t">
                  {w.title}
                  <span className="tag">ai &amp; work</span>
                </span>
                <span className="row-s">
                  One dataset measures the same thing twice — once by breaking each job into
                  cognitive abilities, once by rating the job whole. The two answers point in
                  opposite directions, and the job they disagree about most, out of{" "}
                  {w.source.occupations}, is writing.
                </span>
                <span className="row-fig">
                  <Signature hist={hist} mark={mark} />
                  <span className="axis">
                    <span>0.000</span>
                    <span>
                      AI-exposure score across {w.source.occupations} occupations · orange ={" "}
                      {s.title}, ranked {s.exposure_rank}
                    </span>
                    <span>0.900</span>
                  </span>
                </span>
              </span>
              <span className="row-go">→</span>
            </button>
            <button className="row" data-pane="piece-02" type="button" aria-label={t.title}>
              <span className="row-k">02</span>
              <span>
                <span className="row-t">
                  {t.title}
                  <span className="tag">interactive</span>
                </span>
                <span className="row-s">
                  Before anyone can say “heavy screen users are N times more likely to be
                  depressed”, two lines have to be drawn — and published claims report neither.
                  Move both yourself: the same {num(t.source.subjects)} teenagers will give you any
                  answer from {t.grid.rr_min.toFixed(2)}× to {t.grid.rr_max.toFixed(2)}×.
                </span>
                <span className="row-fig">
                  <Signature hist={t.bdi_hist} mark={th.cutoff_in_file} />
                  <span className="axis">
                    <span>total 0</span>
                    <span>
                      questionnaire totals across {num(t.source.subjects)} teenagers · orange = the
                      line, at {th.cutoff_in_file}
                    </span>
                    <span>{t.source.bdi_max}</span>
                  </span>
                </span>
              </span>
              <span className="row-go">→</span>
            </button>
          </div>

          <p className="kicker">
            files <i />
          </p>
          <div className="rows">
            {[
              ["method", "Method", "Four layers, in the same order every time."],
              [
                "notebook",
                "audit.ipynb",
                `All ${audit.passed} published figures re-derived from the raw source, in pandas, without the pipeline.`,
              ],
              [
                "verify",
                "verify.py",
                "Re-runs both pipelines and refuses to publish anything that drifted.",
              ],
              [
                "data-json",
                "01 · data.json",
                `The committed contract for the AI-exposure piece — ${num(w.source.occupations)} occupations.`,
              ],
              [
                "build-py",
                "01 · build.py",
                "Every calculation behind piece 01, including its own robustness audit.",
              ],
              [
                "data-json-02",
                "02 · data.json",
                `The committed contract for the screen-time piece — all ${t.grid.cutoffs.length * t.grid.thresholds.length} precomputed grid cells.`,
              ],
              [
                "build-py-02",
                "02 · build.py",
                "Every calculation behind piece 02, and the loop the sliders read from.",
              ],
              ["contact", "Contact", "Email, github, colophon."],
              // `label` rather than `t`, which is the screen-time dataset above
            ].map(([id, label, sub]) => (
              <button className="row" data-pane={id} key={id} type="button" aria-label={label}>
                <span className="row-k">—</span>
                <span>
                  <span className="row-t">{label}</span>
                  <span className="row-s">{sub}</span>
                </span>
                <span className="row-go">→</span>
              </button>
            ))}
          </div>
        </>
      ),
    },

    /* ── the piece ────────────────────────────────────────────────────── */
    "piece-01": {
      title: w.title,
      node: (
        <>
          <Intro
            dataset={w.source.name}
            kaggle={w.source.kaggle}
            retrieved={w.source.retrieved}
            what={
              <>
                <p>
                  {w.source.occupations} occupations in the United States, covering{" "}
                  {num(w.source.employment_covered)} workers. For each one the file carries what the
                  Bureau of Labor Statistics publishes — median pay, how many people do it, its
                  projected growth to 2034, the education it asks for — joined to how strongly the
                  job draws on each of {w.abilities.length} cognitive abilities, and to scores for
                  how exposed it is to artificial intelligence.
                </p>
                <p>
                  The interesting part is that exposure is scored <em>twice</em>, at two different
                  levels of description: once for each cognitive ability, and once for each
                  occupation taken whole. One row is one occupation.
                </p>
              </>
            }
            abstract={
              <>
                <p>
                  A job is made of abilities, so a job&rsquo;s exposure ought to be predictable from
                  the exposure of its parts. It is not. The two layers of this dataset run in
                  opposite directions ({sign(f.layers_disagree)}), sharing only {13.5}% of their
                  variance. Exposure also rises with pay rather than falling with it.
                </p>
                <p>
                  Exactly one of the {w.abilities.length} abilities scores negative — Originality,
                  the capacity for ideas nobody has had — and it is the ability writers rank highest
                  on. Yet writing is rated the {s.exposure_rank}th most exposed occupation in the
                  country, and moves further between the two orderings than any other job in the
                  file. The variable the ability model is missing is not an ability. It is the medium
                  the work comes out as: words, or objects.
                </p>
              </>
            }
            asks={[
              <>
                How exposed is each occupation, and does that track pay the way we assume?
              </>,
              <>
                If a job is built from abilities, does predicting its exposure from those abilities
                agree with the score the dataset publishes for the job itself?
              </>,
              <>
                Which occupation disagrees most between the two — and is that claim robust to how the
                comparison is scaled?
              </>,
              <>What kind of variable would explain the direction of the errors?</>,
            ]}
            files={[
              {
                name: "ai_job_exposure.csv",
                rows: "271",
                cols: "23",
                unit: "an occupation",
                used: "title, soc_code, wage, employment, growth, education, ai_exposure_llm_human, ai_exposure_llm_gpt4, ai_exposure_level",
              },
              {
                name: "occupation_cognitive_profile.csv",
                rows: "271",
                cols: "23",
                unit: "an occupation, as 21 ability levels",
                used: "soc_code plus all 21 ability columns, in the file's own column order",
              },
              {
                name: "cognitive_ability_ai_exposure.csv",
                rows: "21",
                cols: "3",
                unit: "a cognitive ability",
                used: "cognitive_ability, cognitive_family, ai_exposure_score",
              },
            ]}
            caveat={
              <>
                The per-ability scores and the per-occupation scores come from different
                methodologies and were not built to be compared with each other.{" "}
                <b>Comparing them is my analytical decision, not a claim the dataset makes.</b> The
                negative correlation shows that the two measure different constructs — not that
                either one is wrong.
              </>
            }
          />

          <p className="kicker">
            piece 01 · the premise <i />
          </p>
          <p className="lede">
            Of the <Anno src="[n]">{w.source.occupations}</Anno> occupations measured in this
            dataset, writing ranks{" "}
            <Anno src="[rank]" pane="evidence-writers">
              {s.exposure_rank}
            </Anno>{" "}
            most exposed to artificial intelligence.
          </p>

          <p className="txt">
            Only three sit above it: survey researchers, translators, and public relations
            specialists. Below it sit <Anno src="[271−4]">267</Anno> others — including almost
            every job we have spent a decade imagining would go first. Janitors are down there,
            scoring{" "}
            <Anno src="[Janitors]" pane="evidence-extremes">
              0.028
            </Anno>
            : twenty-eight times lower than writing.
          </p>

          <p className="txt">
            That is not the finding. That is only the premise — and it is already enough to turn one
            old assumption over. In this data, exposure to AI <em>rises</em> with pay rather than
            falling with it{" "}
            <Anno src="[pearson]" pane="evidence-pay">
              {sign(f.exposure_wage_pearson)}
            </Anno>
            . The jobs the dataset calls most exposed are, on the whole, the better-paid ones.
          </p>

          <p className="kicker">
            finding 01 · the only negative one <i />
          </p>
          <h3 className="h">
            Of {w.abilities.length} cognitive abilities, exactly one scores negative.
          </h3>
          <p className="txt dim">
            The dataset measures exposure twice, at two different levels of explanation. Once for
            each cognitive ability a job might demand, and once for each job as a whole. Start with
            the abilities.
          </p>

          <p className="txt">
            The most exposed ability is{" "}
            <Anno src="[1.908]" pane="evidence-abilities">
              {f.most_exposed_ability}
            </Anno>{" "}
            — arranging things according to a rule. Then memorisation, then perceptual speed. All of
            them tidy, finite operations, the kind where an answer can be marked right or wrong.
          </p>

          <p className="txt">
            And at the bottom of the list, alone below zero:{" "}
            <Anno src="[−0.144]" pane="evidence-abilities">
              Originality
            </Anno>
            . The ability to come up with ideas nobody has had. It is the only one of{" "}
            <Anno src="[21]">{w.abilities.length}</Anno> that scores negative — meaning that the
            more a job depends on it, the <em>less</em> this dataset thinks AI can do it. On that
            ability, writers sit in the{" "}
            <Anno src="[pct]" pane="evidence-writers">
              97.4
            </Anno>
            th percentile.
          </p>

          <p className="txt">
            The whole instrument is worth looking at once, because the fable at the end of this page
            is about it: all{" "}
            <Anno src="[subject_profile]" pane="evidence-profile">
              {w.abilities.length} rows
            </Anno>
            , in the order the source file lists them, with how much writing demands each one.
          </p>

          <p className="kicker">
            finding 02 · the dataset against itself <i />
          </p>
          <h3 className="h">
            If both measures are measuring the same thing, they have to agree.
          </h3>
          <p className="txt dim">
            A job is made of abilities. So it should be possible to predict a job&rsquo;s exposure
            from the exposure of the abilities it is built from, weighted by how much the job
            demands each one. Do that for all {w.source.occupations} jobs, then compare the
            prediction against the score the dataset actually publishes.
          </p>

          <p className="txt">
            They do not agree. They are not even weakly related — they run{" "}
            <em>in opposite directions</em>{" "}
            <Anno src="[pearson]" pane="evidence-two-layers">
              {sign(f.layers_disagree)}
            </Anno>
            . The more a job is built out of abilities this dataset calls exposed, the less likely
            that same dataset is to call the job exposed. The two layers share only{" "}
            <Anno src="[R²]" pane="evidence-two-layers">
              13.5%
            </Anno>{" "}
            of their variance; the other 86.5% is unaccounted for.
          </p>

          <p className="txt">
            And one occupation moves further between those two orderings than any other. Built from
            its parts, writing should rank{" "}
            <Anno src="[rank_predicted]" pane="evidence-two-layers">
              {s.rank_predicted}
            </Anno>{" "}
            of {w.source.occupations} — almost the safest job in the country. Rated whole, it ranks{" "}
            <Anno src="[rank_actual]" pane="evidence-two-layers">
              {s.rank_actual}
            </Anno>
            . That is a displacement of{" "}
            <Anno src="[move]" pane="evidence-two-layers">
              {sign(w.robustness.subject.move, 0)} places
            </Anno>
            , the largest of all {w.source.occupations}.
          </p>

          <Expert title="why this is stated as displacement rather than as a residual">
            <p>
              An earlier version of this piece led with a residual instead: writing sat{" "}
              <b>{sign(w.robustness.subject.shipped_residual)}</b> above its fitted value,{" "}
              <b>{w.robustness.subject.shipped_z} SD</b> out, <b>rank 1 of {w.source.occupations}</b>
              . I tested whether that survives a different scaling choice. It does not, so the claim
              was demoted and this block exists to say so.
            </p>
            <Check label="what is robust">
              The correlation between the two layers is{" "}
              <b>{sign(w.robustness.layers_r, 4)}</b>{" "}
              <CI lo={w.robustness.layers_r_ci[0]} hi={w.robustness.layers_r_ci[1]} />, Spearman{" "}
              <b>{sign(w.robustness.layers_spearman, 4)}</b>. Pearson is unchanged by any linear
              rescaling of the prediction, so this is robust by construction, and the interval is
              nowhere near zero. Rank displacement is also scale-free: it compares two orderings and
              never touches a unit.
            </Check>
            <Check label="what is not">
              Residual size and residual rank depend on how the prediction is mapped onto the
              rating&rsquo;s scale. Shipped method — standardise the prediction, match the
              rating&rsquo;s mean and SD — puts writing at rank{" "}
              <b>{w.robustness.subject.shipped_rank}</b>. Ordinary least squares puts it at rank{" "}
              <b>{w.robustness.subject.ols_rank}</b> with a residual of{" "}
              <b>{sign(w.robustness.subject.ols_residual)}</b> ({w.robustness.subject.ols_z} SD).
              Still notable. Not “the largest departure in the dataset”.
            </Check>
            <Check label="the objection">
              You might say OLS is simply the right answer and I should use it. The OLS slope here is{" "}
              <b>{w.robustness.ols_slope}</b> — negative. Its best-fitting line therefore predicts
              that jobs built from more-exposed abilities are rated <em>less</em> exposed, which
              bakes in the very inversion this piece is trying to show. A residual against that line
              cannot answer the question “if parts implied the whole, where would this job sit?”. My
              rescaling answers that question, but it is an assumption, not a regression — and
              calling its output a “residual” invited exactly the wrong reading.
            </Check>
            <Check label="what would break it">
              If the ability-exposure weights were rescaled non-linearly, or if the ability demand
              levels were centred before weighting, the displacement could change. That has not been
              tested. The correlation would survive both.
            </Check>
          </Expert>

          <p className="txt">
            You can look up any occupation in the file and see where the two measures put it.
          </p>

          <Finder />

          <p className="txt">
            Look at which way the errors go. Everything predicted too safe works through words.
            Everything predicted too exposed works through objects. A mechanic&rsquo;s work really
            does demand high perceptual speed — but that speed is spent through hands, in three
            dimensions, on a thing that can be dropped. The ability model cannot see bodies. It only
            sees operations.
          </p>

          <p className="txt">
            There is a third rating in this file, and it takes the same side. Alongside the human
            rater, every occupation was also scored by GPT-4. The two agree at{" "}
            <Anno src="[raters]" pane="evidence-raters">
              {sign(w.raters.r, 4)}
            </Anno>
            , which sounds like agreement until you look at where they part. GPT-4 rates medical
            transcription{" "}
            <Anno src="[max gap]" pane="evidence-raters">
              {sign(w.raters.max_abs_gap)}
            </Anno>{" "}
            higher than the human rater does — {w.raters.gpt4_higher[0].human} against{" "}
            {w.raters.gpt4_higher[0].gpt4}, from fairly safe to almost entirely exposed, on the same
            job. Bookkeeping clerks, court reporters, composers: same direction.
          </p>

          <p className="txt">
            And the occupations the human rater marks higher than GPT-4 does are childcare workers,
            fitness instructors, concierges. Work whose content is <em>being present with a
            person</em>. So a model asked to rate exposure over-weights work that looks like text
            and under-weights work that requires a body in a room — which is the same failure the
            ability layer makes, found again by a measure that shares none of its machinery.
          </p>

          <p className="txt">
            This is not proof that one of the two raters is wrong. Most likely both are right and
            measuring different things: one the cognitive operation, the other the practical
            substitutability of a whole occupation. But they were published side by side, in one
            dataset, under one word: <em>exposure</em>.
          </p>

          <p className="kicker">
            the bridge · findings that force decisions <i />
          </p>
          <p className="txt dim">
            This is the layer that separates data as a foundation from data as decoration. Change a
            number in the left column and the story on the right has to be rewritten.
          </p>

          <div className="seam">
            {[
              [
                `${s.title} is the largest disagreement in the dataset: predicted rank ${s.rank_predicted}, rated rank ${s.rank_actual}, out of ${w.source.occupations}.`,
                <>
                  The story cannot be about being replaced. It has to be about being{" "}
                  <em>misread</em> — the distance between what a job is made of and what a job is
                  judged to be.
                </>,
              ],
              [
                `Originality is the only one of ${w.abilities.length} abilities scoring negative (${sign(f.originality_exposure)}), and it is the ability writers rank highest on.`,
                <>
                  The turn has to happen on that single quality, and it has to be the quality that{" "}
                  <em>cannot be entered into a column</em>. Not a metaphor; the mechanism.
                </>,
              ],
              [
                `Writing's projected growth is +${s.growth}%, “${s.outlook}”. Of ${f.high_n} highly exposed occupations, ${f.high_growing} are projected to grow and ${f.high_declining} to shrink.`,
                <>
                  No apocalypse. Nothing is allowed to end inside the story, because not one number
                  supports an ending. What is left is <em>ambiguity</em>.
                </>,
              ],
            ].map(([fact, decision], i) => (
              <div className="seam-row" key={i}>
                <div className="seam-cell">
                  <span>finding</span>
                  <p>{fact as string}</p>
                </div>
                <div className="seam-cell decision">
                  <span>decision</span>
                  <p>{decision}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── the story ─────────────────────────────────────────────── */}
          <p className="kicker">
            the story <i />
          </p>
          <div className="tale">
            <h3 className="tale-h">The Weigher of Trades</h3>
            <p className="tale-note">
              A fable. It contains no figures at all — the numbers have had their say already, and
              what is left of them here is only their shape.
            </p>

            <p className="txt">
              Once there was a kingdom that heard a rumour. An engine was coming, the rumour said,
              that could do what people do.
            </p>

            <p className="txt">
              The king was not a cruel man, only a careful one. He did not want to wake one morning
              and find half his subjects idle and the other half unaware. So he sent out a clerk
              with a brass instrument and a ledger, and told him to weigh every trade in the
              kingdom, so that when the engine arrived he would know whom to move and whom to leave
              alone.
            </p>

            <p className="txt">
              The instrument was a good one. Along its edge ran a row of small notches, and each
              notch stood for something a pair of hands might be asked to do. To remember. To sort.
              To notice quickly. To speak, and to be understood. To picture a thing that was not in
              the room. To think of something nobody had thought of yet.
            </p>

            <p className="txt">
              The clerk would come to a workshop, watch the work for an afternoon, and ask: how much
              of this does your trade require? And of this? And of this? Then he turned the notches
              to match, and the instrument settled, and gave a number, and the number went into the
              ledger.
            </p>

            <p className="txt">
              He weighed the roofers. The instrument said: safe.
              <br />
              He weighed the boilermakers. Safe.
              <br />
              He weighed the butchers, and the men who mend the great wheels, and the women who lay
              the cables along the top of the world. Safe, safe, safe.
            </p>

            <p className="txt">
              It was pleasant work, and the ledger filled, and by autumn the clerk came to the last
              house on the last road, where a woman sat at a table, writing.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              He watched her for an afternoon, as he had watched all the others, and then he turned
              his notches.
            </p>

            <p className="txt">
              Remembering: some. Sorting: a great deal, though not in any order he could see.
              Noticing quickly: hardly any. Picturing a thing not in the room: a very great deal.
              Speaking so as to be understood: as much as any trade in the kingdom, and then more.
            </p>

            <p className="txt">
              The instrument settled. It gave its number. And the number said: <em>safe</em>. Safer
              than the roofers. Safer than the butchers. Safer, in fact, than almost every trade the
              clerk had weighed all summer.
            </p>

            <p className="txt">
              He wrote it down. He wished her a good winter. The ledger went up to the king, and in
              the last house on the last road everybody slept well.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              In the spring the engine arrived.
            </p>

            <p className="txt">
              It was smaller than anyone expected, and it did not want anything, and this was
              somehow worse. The king, being careful, did not consult his ledger. He put the
              question to the engine directly: of all the trades in my kingdom, which could you do?
            </p>

            <p className="txt">
              The engine answered without hesitating, the way a river answers a slope. It named a
              trade, and then another, and then another. And fourth on its list — fourth of all the
              trades in the kingdom, ahead of the clerks and the counters and every other trade the
              ledger had marked in red — it named the woman in the last house on the last road.
            </p>

            <p className="txt">
              The king had the two lists laid side by side on a long table, and stood looking at them
              for some time. They were the same trades. They were the same kingdom. And they were in
              very nearly the opposite order.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              Here is the thing about the notches on the brass instrument.
            </p>

            <p className="txt">
              Of all of them, every one but a single notch worked the same way: turn it up, and the
              engine grew stronger. The more remembering a trade required, the better the engine
              could do it. The more sorting, the better. The more noticing quickly, the better.
            </p>

            <p className="txt">
              One notch, and only one, ran the other way. The notch for{" "}
              <em>thinking of something nobody had thought of yet</em>. Turn that one up and the
              engine faltered, and turned back, and had nothing to offer.
            </p>

            <p className="txt">
              It was the one notch the woman had turned nearly all the way.
            </p>

            <p className="txt">
              So both readings were true, and that is the part the king could not get past. She was
              made, more than almost anyone in his kingdom, out of the single thing the engine could
              not do. And her trade had been named fourth.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              The clerk, when he was finally asked, took a long time to answer, and when he did he
              did not defend his instrument.
            </p>

            <p className="txt">
              It weighs what the work asks of you, he said. It has no notch for what the work comes
              out as. A mechanic and a writer can turn the very same notches — both must notice
              quickly, both must hold a shape in mind, both must judge when a thing is finished. But
              one of them puts their hands on an object that can fall. My instrument cannot see the
              falling. It can only see the noticing.
            </p>

            <p className="txt">
              And there was something else, which he said more quietly. The instrument asks{" "}
              <em>how much</em>. It cannot ask <em>which one</em>. Which sentence. In which
              paragraph. After how many were thrown away. There is no notch for that and there never
              will be — because a notch has to compare one person against another, and what makes
              her sentences hers is precisely that they cannot be compared.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              Nothing happened as fast as anyone expected. That is usually how it goes.
            </p>

            <p className="txt">
              The engine stayed. Some trades thinned and some thickened, and not always the ones the
              lists had promised. The woman in the last house on the last road went on writing, and
              was sometimes paid more than before and sometimes less, and no year was quite like the
              last.
            </p>

            <p className="txt">
              Both lists went into a drawer in the palace, where they are still, one on top of the
              other, each perfectly correct. Nobody has ever taken them out and set them side by
              side again, and so nobody has noticed that they disagree.
            </p>
          </div>

          <div className="notes">
            <p>
              <b>Source.</b> <i>{w.source.name}</i>, Kaggle — <code>{w.source.kaggle}</code>.
              Retrieved {w.source.retrieved}. {w.source.occupations} occupations,{" "}
              {num(w.source.employment_covered)} workers covered, {w.abilities.length} cognitive
              abilities.
            </p>
            <p>
              <b>Limits.</b> The per-ability scores and the per-occupation scores come from
              different methodologies and were not designed to be compared directly. The negative
              correlation above shows that they measure different constructs — not that either one
              is wrong. Comparing them is my analytical decision, not a claim the dataset makes.
              Every figure set in mono is traceable to a source file; the fable is fiction, and
              deliberately contains no figures at all.
            </p>
          </div>
        </>
      ),
    },

    /* ── evidence ─────────────────────────────────────────────────────── */
    "evidence-two-layers": {
      title: "evidence · the two layers",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            Left: where each occupation ranks when its exposure is <em>predicted</em> from the{" "}
            {w.abilities.length} abilities it is built from. Right: where it ranks when the dataset{" "}
            <em>rates</em> the occupation whole. Same {w.source.occupations} jobs, two
            measurements. Orange lines rise, blue lines fall.
          </p>
          <div className="tile">
            <SlopeGraph pairs={w.slope.pairs} hero={w.slope.hero} n={w.slope.n} />
          </div>
          <p className="tile-cap">
            A correlation of <b>{sign(f.layers_disagree)}</b> is not a weak relationship — it is an
            inverted one. The thick orange line is <b>{s.title}</b>, moving from rank{" "}
            <b>{s.rank_predicted}</b> to rank <b>{s.rank_actual}</b>.
          </p>

          <p className="kicker" style={{ marginTop: "1.8rem" }}>
            consistency test <i />
          </p>
          <dl className="kv">
            {[
              ["r (pearson)", sign(f.layers_disagree), true],
              ["R²", num(f.layers_r2, 3), true],
              ["variance unaccounted for", "86.5%", false],
              ["n", num(w.source.occupations), false],
            ].map(([k, v, hit]) => (
              <div key={k as string} className={hit ? "hit" : undefined}>
                <dt>{k as string}</dt>
                <dd>{v as string}</dd>
              </div>
            ))}
          </dl>

          <p className="kicker">
            largest disagreements, both directions <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>occupation</th>
                  <th>predicted</th>
                  <th>rated</th>
                  <th>gap</th>
                </tr>
              </thead>
              <tbody>
                {w.residuals.over.slice(0, 4).map((r, i) => (
                  <tr key={r.title} className={i === 0 ? "hit" : undefined}>
                    <td>{r.title}</td>
                    <td>{num(r.fit, 3)}</td>
                    <td>{num(r.actual, 3)}</td>
                    <td>{sign(r.residual)}</td>
                  </tr>
                ))}
                <tr>
                  <td>…</td>
                  <td />
                  <td />
                  <td />
                </tr>
                {w.residuals.under.slice(-3).map((r) => (
                  <tr key={r.title}>
                    <td>{r.title}</td>
                    <td>{num(r.fit, 3)}</td>
                    <td>{num(r.actual, 3)}</td>
                    <td>{sign(r.residual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tile-cap">
            Everything predicted too safe works through words. Everything predicted too exposed
            works through objects.
          </p>
        </>
      ),
    },

    "evidence-raters": {
      title: "evidence · two raters, same jobs",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            Both columns are per-occupation exposure ratings of the same{" "}
            {num(w.raters.n)} jobs — one by a human rater, one by GPT-4. They correlate{" "}
            <b>{sign(w.raters.r, 4)}</b>{" "}
            <CI lo={w.raters.r_ci[0]} hi={w.raters.r_ci[1]} />, with a mean absolute gap of{" "}
            <b>{w.raters.mean_abs_gap}</b> and a maximum of <b>{w.raters.max_abs_gap}</b>.
          </p>

          <p className="kicker">
            GPT-4 rates these far more exposed than the human did <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>occupation</th>
                  <th>human</th>
                  <th>gpt-4</th>
                  <th>gap</th>
                </tr>
              </thead>
              <tbody>
                {w.raters.gpt4_higher.map((r) => (
                  <tr key={r.title}>
                    <td>{r.title}</td>
                    <td>{num(r.human, 3)}</td>
                    <td>{num(r.gpt4, 3)}</td>
                    <td className="up">{sign(r.gap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="kicker">
            and these far less <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>occupation</th>
                  <th>human</th>
                  <th>gpt-4</th>
                  <th>gap</th>
                </tr>
              </thead>
              <tbody>
                {[...w.raters.human_higher].reverse().map((r) => (
                  <tr key={r.title}>
                    <td>{r.title}</td>
                    <td>{num(r.human, 3)}</td>
                    <td>{num(r.gpt4, 3)}</td>
                    <td className="down">{sign(r.gap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="tile-cap">
            Read the two lists as pairs. Transcription, bookkeeping, court reporting, composition —
            work that arrives as text or symbols. Childcare, fitness instruction, concierge work —
            work that requires being in the room. <b>{w.subject.title}</b> sits at{" "}
            {num(w.raters.subject.human, 3)} human against {num(w.raters.subject.gpt4, 3)} GPT-4, a
            gap of {sign(w.raters.subject.gap)}, ranked {w.raters.subject.gap_rank} of{" "}
            {num(w.raters.n)}: GPT-4 thinks writing is even more exposed than the human rater does.
          </p>

          <Expert title="what this can and cannot be used for">
            <Check label="not independent">
              These raters are not independent of each other in any strong sense — both are scoring
              the same occupation descriptions, and the human rater may have had model output
              available. Treat the agreement as a consistency check, not as replication.
            </Check>
            <Check label="the pattern is the point">
              A correlation of {sign(w.raters.r, 4)} between two raters means the disagreements are
              a small minority of cases. What makes them worth showing is that they are not scattered
              — they sort cleanly by medium of output, the same split the ability layer produces.
            </Check>
            <Check label="direction unknown">
              Nothing here says which rater is right. It is entirely possible that GPT-4 is correct
              about transcription and the human rater is correct about concierges. The claim is only
              that the two disagree along one axis, and that the axis is not cognitive difficulty.
            </Check>
          </Expert>
        </>
      ),
    },

    "evidence-abilities": {
      title: "evidence · 21 abilities",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            AI-exposure score for each cognitive ability, sorted. The vertical line is zero; bars to
            its left mean AI does <em>worse</em> as that ability matters more. The right-hand column
            is where <b>{s.title}</b> sits on that ability among all {w.source.occupations}{" "}
            occupations.
          </p>
          <div className="tile">
            <div className="scroller" style={{ margin: 0 }}>
              <AbilityBars rows={w.subject_profile} />
            </div>
          </div>
          <p className="tile-cap">
            Writers are below the median on <b>all ten</b> of the most exposed abilities, and above
            the 90th percentile on four — every one of which sits in the least exposed half. Exactly
            one ability scores negative: <b>Originality, {sign(f.originality_exposure)}</b>, and
            there writers reach the <b>97.4</b>th percentile.
          </p>

          <p className="kicker" style={{ marginTop: "1.8rem" }}>
            five most exposed abilities <i />
          </p>
          <dl className="kv">
            {w.abilities.slice(0, 5).map((a) => (
              <div key={a.ability}>
                <dt>{a.ability}</dt>
                <dd>{num(a.exposure, 3)}</dd>
              </div>
            ))}
          </dl>
        </>
      ),
    },

    "evidence-writers": {
      title: "evidence · writers and authors",
      node: (
        <>
          <p className="txt dim">
            Every value here comes from a single row, SOC {s.soc}, in the source file.
          </p>
          <dl className="kv">
            {[
              ["title", s.title],
              ["soc", s.soc],
              ["exposure", num(s.exposure, 3)],
              ["exposure_rank", `${s.exposure_rank} / ${w.source.occupations}`],
              ["exposure_gpt4", num(s.exposure_gpt4, 3)],
              ["wage (median)", `$${num(s.wage)}`],
              ["employment", num(s.employment)],
              ["growth 2024–34", `+${s.growth}%`],
              ["outlook", s.outlook],
              ["education", s.education],
              ["top_ability", s.top_ability],
              ["fit (predicted)", num(s.fit, 3)],
              ["residual", sign(s.residual)],
              ["residual_z", num(s.residual_z, 2)],
              ["residual_rank", `${s.residual_rank} / ${w.source.occupations}`],
              ["rank_predicted", String(s.rank_predicted)],
              ["rank_actual", String(s.rank_actual)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="tile-cap">
            Predicted rank <b>{s.rank_predicted}</b>, rated rank <b>{s.rank_actual}</b>. That is
            the largest gap in the dataset.
          </p>
        </>
      ),
    },

    "evidence-profile": {
      title: "evidence · the 21-row profile",
      node: (
        <>
          <p className="txt dim">
            This is the instrument the fable is about: {w.abilities.length} abilities, in the order
            the source file lists them, with how much this occupation demands each one and where
            that puts it among all {w.source.occupations} jobs.
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ability</th>
                  <th>level</th>
                  <th>percentile</th>
                </tr>
              </thead>
              <tbody>
                {w.subject_profile.map((r) => (
                  <tr key={r.row} className={r.row === w.originality_row ? "hit" : undefined}>
                    <td>{String(r.row).padStart(2, "0")}</td>
                    <td>{r.ability}</td>
                    <td>{num(r.level, 2)}</td>
                    <td>{num(r.percentile, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tile-cap">
            Row <b>{w.originality_row}</b> is highlighted: Originality. The only ability with a
            negative exposure score, and the one notch that runs the other way.
          </p>
        </>
      ),
    },

    "evidence-pay": {
      title: "evidence · exposure and pay",
      node: (
        <>
          <p className="txt dim">
            The familiar assumption is that automation threatens low-paid work first. In this
            dataset the relationship runs the other way.
          </p>
          <dl className="kv">
            {[
              ["pearson (exposure × wage)", sign(f.exposure_wage_pearson), true],
              ["spearman (on ranks)", sign(f.exposure_wage_spearman), true],
              ["human rater × gpt-4 agreement", num(f.human_gpt4_corr, 3), false],
            ].map(([k, v, hit]) => (
              <div key={k as string} className={hit ? "hit" : undefined}>
                <dt>{k as string}</dt>
                <dd>{v as string}</dd>
              </div>
            ))}
          </dl>

          <p className="kicker">
            median wage by exposure band <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>band</th>
                  <th>n</th>
                  <th>workers</th>
                  <th>median wage</th>
                </tr>
              </thead>
              <tbody>
                {w.bands.map((b) => (
                  <tr key={b.level}>
                    <td>{b.level}</td>
                    <td>{b.n}</td>
                    <td>{num(b.employment)}</td>
                    <td>${num(b.median_wage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="kicker">
            by required education <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>level</th>
                  <th>n</th>
                  <th>median exposure</th>
                  <th>median wage</th>
                </tr>
              </thead>
              <tbody>
                {w.education.map((e) => (
                  <tr key={e.level}>
                    <td>{e.level}</td>
                    <td>{e.n}</td>
                    <td>{num(e.median_exposure, 3)}</td>
                    <td>${num(e.median_wage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    },

    "evidence-extremes": {
      title: "evidence · both ends of the list",
      node: (
        <>
          <p className="kicker">
            most exposed <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>occupation</th>
                  <th>exposure</th>
                  <th>wage</th>
                </tr>
              </thead>
              <tbody>
                {w.extremes.most.map((r) => (
                  <tr key={r.title} className={r.title === s.title ? "hit" : undefined}>
                    <td>{r.title}</td>
                    <td>{num(r.exposure, 3)}</td>
                    <td>${num(r.wage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="kicker">
            least exposed <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>occupation</th>
                  <th>exposure</th>
                  <th>wage</th>
                </tr>
              </thead>
              <tbody>
                {w.extremes.least.map((r) => (
                  <tr key={r.title}>
                    <td>{r.title}</td>
                    <td>{num(r.exposure, 3)}</td>
                    <td>${num(r.wage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tile-cap">
            Of {f.high_n} highly exposed occupations, <b>{f.high_growing}</b> are projected to grow
            and <b>{f.high_declining}</b> to shrink. Not one number here supports an apocalypse —
            which is why the fable does not contain one.
          </p>
        </>
      ),
    },

    /* ── piece 02 ─────────────────────────────────────────────────────── */
    "piece-02": {
      title: t.title,
      node: (
        <>
          <Intro
            dataset={t.source.name}
            kaggle={t.source.kaggle}
            retrieved={t.source.retrieved}
            what={
              <>
                <p>
                  {num(t.source.subjects)} teenagers — {num(t.source.boys)} boys and{" "}
                  {num(t.source.girls)} girls. For each one: how much leisure screen time they
                  report, four separate measures of how they sleep, and a{" "}
                  {t.source.items}-question depression questionnaire kept both as a total and as its{" "}
                  {t.source.items} individual answers.
                </p>
                <p>
                  The questionnaire total runs from {t.source.bdi_min} to {t.source.bdi_max}, with a
                  median of {t.source.bdi_median}. One row is one teenager. The file also ships a
                  yes/no <code>depressed</code> column, without saying what produced it.
                </p>
              </>
            }
            abstract={
              <>
                <p>
                  Screen time is associated with depression scores here, and the association is
                  tiny: {sign(th.screen_r, 4)}, accounting for {th.screen_r2_pct}% of why these
                  teenagers differ from one another. Sleep quality accounts for{" "}
                  {th.sleepq_r2_pct}% — {th.variance_ratio} times as much — and holding hours slept
                  constant absorbs {sleep.absorbed_pct}% of the screen association.
                </p>
                <p>
                  The larger finding is about how such a claim gets made. Saying anyone{" "}
                  <em>is</em> depressed requires drawing a line across a smooth distribution, and
                  saying anyone is a <em>heavy user</em> requires drawing a second one. Neither line
                  is usually reported. Moving both across their plausible range yields{" "}
                  {t.grid.cutoffs.length * t.grid.thresholds.length} risk ratios from{" "}
                  {t.grid.rr_min.toFixed(2)}× to {t.grid.rr_max.toFixed(2)}×, all arithmetically
                  correct, of which {t.robustness.grid_cells - t.robustness.grid_solid} cannot be
                  distinguished from no difference at all. And breaking the questionnaire into its{" "}
                  {t.source.items} items reveals no symptom to point at: the association is spread
                  almost evenly across all of them.
                </p>
              </>
            }
            asks={[
              <>How strong is the screen-time association really, next to everything else measured on the same children?</>,
              <>What has to be decided before “N times more likely to be depressed” can be written at all?</>,
              <>Across every defensible pair of those decisions, what range of answers does this one dataset support?</>,
              <>Is the association attached to any particular symptom, or spread across all of them?</>,
            ]}
            files={[
              {
                name: "screen_time_mental_health.csv",
                rows: num(t.source.subjects),
                cols: "10",
                unit: "a teenager, summarised",
                used: "sex, screen_time_index, est_leisure_screen_hours, sleep_quality_index, avg_sleep_hours, midsleep_weekend_hours, social_jetlag_hours, bdi_total, depressed",
              },
              {
                name: "bdi_and_screen_items.csv",
                rows: num(t.source.subjects),
                cols: "29",
                unit: "the same teenager, answer by answer",
                used: "screen_normal_day_1to6 and bdi_item_01 … bdi_item_21",
              },
            ]}
            caveat={
              <>
                This is cross-sectional. <b>Nothing here can tell you which way any arrow points</b>{" "}
                — a teenager who is already unhappy may reach for a screen rather than the reverse.
                The partial correlations show how much of a weak association travels with sleep; they
                are a decomposition, not a causal adjustment. And the questionnaire items ship
                unlabelled, so they are reported by number and never read as specific symptoms.
              </>
            }
          />

          <p className="kicker">
            piece 02 · the premise <i />
          </p>
          <p className="lede">
            You have read the headline. Screen time is linked to teenage depression. In this data,
            that is true — and it is also almost nothing.
          </p>

          <p className="txt">
            {num(t.source.subjects)} teenagers, each with a screen-time measure and a{" "}
            {t.source.items}-question depression questionnaire. The correlation between them is{" "}
            <Anno src="[screen_r]" pane="evidence-screen">
              {sign(th.screen_r, 4)}
            </Anno>
            . Real, positive, and in a sample this size not a fluke.
          </p>

          <p className="txt">
            But a correlation of that size accounts for{" "}
            <Anno src="[screen_r2]" pane="evidence-screen">
              {th.screen_r2_pct}%
            </Anno>{" "}
            of why these teenagers differ from one another in how they answered. The other{" "}
            {(100 - th.screen_r2_pct).toFixed(1)}% is something else. Screen time is not the story
            of teenage unhappiness. It is a rounding error that got a press cycle.
          </p>

          <p className="txt">
            Here is what does better, in the same file, measured on the same children: how well they
            sleep, at{" "}
            <Anno src="[sleepq_r2]" pane="evidence-screen">
              {th.sleepq_r2_pct}%
            </Anno>{" "}
            —{" "}
            <Anno src="[ratio]" pane="evidence-screen">
              {th.variance_ratio}×
            </Anno>{" "}
            the explanatory power of screens. And nearly half of the screen-time association,{" "}
            <Anno src="[absorbed]" pane="evidence-screen">
              {sleep.absorbed_pct}%
            </Anno>{" "}
            of it, disappears the moment you account for how many hours they actually slept.
          </p>

          <p className="txt">
            If percentages of variance mean nothing to you, here is the same gap in plain units.
            Both columns are average depression score, climbing as you go down. One staircase is
            shallow and one is steep.
          </p>

          <div className="stairs">
            {[
              ["more screen time →", t.dose.screen, t.dose.screen_swing],
              ["worse sleep →", t.dose.sleep_quality, t.dose.sleep_swing],
            ].map(([label, steps, swing]) => (
              <div key={label as string}>
                <span className="stairs-h">{label as string}</span>
                {(steps as typeof t.dose.screen).map((s) => (
                  <span className="stair" key={s.level}>
                    <span className="stair-k">level {s.level}</span>
                    <span className="stair-bar">
                      <i style={{ width: `${(s.mean / 17) * 100}%` }} />
                    </span>
                    <span className="stair-v">{s.mean}</span>
                  </span>
                ))}
                <span className="stairs-f">
                  swing of <b>{swing as number}</b> points
                </span>
              </div>
            ))}
          </div>
          <p className="tile-cap">
            Same {num(t.source.subjects)} teenagers, same questionnaire, same scale. Going from the
            least to the most screen time moves the average by{" "}
            <Anno src="[screen_swing]" pane="evidence-screen">
              {t.dose.screen_swing}
            </Anno>{" "}
            points. Going from the best to the worst sleep moves it by{" "}
            <Anno src="[sleep_swing]" pane="evidence-screen">
              {t.dose.sleep_swing}
            </Anno>
            . Both climb steadily, so neither is noise — they are just very different sizes.
          </p>

          <p className="kicker">
            finding 01 · two lines nobody reports <i />
          </p>
          <h3 className="h">“More likely to be depressed” requires drawing two lines first.</h3>
          <p className="txt dim">
            A questionnaire total is a number from {t.source.bdi_min} to {t.source.bdi_max}. To say
            somebody <em>is</em> depressed you have to decide where the number stops being ordinary
            — and to say somebody is a <em>heavy user</em> you have to decide that too. The source
            file draws the first line at{" "}
            <Anno src="[cutoff]" pane="evidence-cutoff">
              {th.cutoff_in_file}
            </Anno>
            , which is why it reports {th.share_flagged}% of these teenagers as depressed. Nothing
            forced that number.
          </p>
          <p className="txt dim">
            Both sliders below move real lines. Every ratio they produce was computed in Python and
            committed to the data file — the page is not calculating anything, it is showing you{" "}
            {t.grid.cutoffs.length * t.grid.thresholds.length} results that already exist.
          </p>

          <Headline />

          <p className="txt">
            That is the finding. Not that the number is wrong — every one of those{" "}
            {t.grid.cutoffs.length * t.grid.thresholds.length} ratios is arithmetically correct. The
            finding is that <em>the sentence is a choice</em>, and the two decisions that determine
            it are the two things a published claim almost never states.
          </p>

          <p className="txt">
            There is a harder version of this. Of those{" "}
            {t.grid.cutoffs.length * t.grid.thresholds.length} ratios,{" "}
            <Anno src="[grid_solid]" pane="evidence-intervals">
              {t.robustness.grid_cells - t.robustness.grid_solid}
            </Anno>{" "}
            cannot be told apart from no difference at all — their confidence intervals include 1.
            They are still real numbers, still correct, still quotable. Those are the hatched cells
            in the grid above.
          </p>

          <Expert title="intervals, and why the grid is hatched">
            <Check label="method">
              Each cell is a risk ratio with a 95% interval from the Katz log method:{" "}
              <code>se = √(1/a − 1/n₁ + 1/c − 1/n₀)</code>, exponentiated. Analytic rather than
              bootstrapped, so the pipeline stays deterministic and needs no seed.
            </Check>
            <Check label="result">
              <b>
                {t.robustness.grid_solid} of {t.robustness.grid_cells}
              </b>{" "}
              cells ({t.robustness.grid_solid_pct}%) have an interval clear of 1. The remaining{" "}
              <b>{t.robustness.grid_cells - t.robustness.grid_solid}</b> do not, and are almost all
              at the extremes where the flagged group collapses to a few dozen teenagers.
            </Check>
            <Check label="the point estimate">
              The headline correlation itself is solid:{" "}
              <b>{sign(t.robustness.screen.pearson, 4)}</b>{" "}
              <CI lo={t.robustness.screen.ci[0]} hi={t.robustness.screen.ci[1]} /> at n ={" "}
              {num(t.robustness.screen.n)}. Small is not the same as uncertain — this association is
              precisely estimated and genuinely tiny, which is a different and more interesting
              problem than being noisy.
            </Check>
            <Check label="objection">
              You could argue that reporting the widest ratio is a straw man, since no careful
              analyst would cut at {t.grid.cutoffs[t.grid.cutoffs.length - 1]}. Fair. The point is
              not that anyone does it deliberately, but that the sentence carries no trace of which
              lines were used, so a reader cannot tell a careful choice from a convenient one.
            </Check>
          </Expert>

          <p className="kicker">
            finding 02 · nothing to point at <i />
          </p>
          <h3 className="h">
            There is no symptom screen time attaches to. It attaches to all of them, faintly.
          </h3>
          <p className="txt dim">
            If screens were doing something specific to these teenagers, it should show up
            somewhere specific — worse sleep, or more self-blame, or less appetite. So take the
            questionnaire apart and correlate screen time against each of its {t.source.items}{" "}
            questions on its own.
          </p>

          <Flatness />

          <p className="txt">
            I expected a spike and went looking for one. There isn&rsquo;t a spike. My first reading
            of that was: no single symptom means no specific harm, so what this is really measuring
            is a general mood in how someone fills out a long form late at night.
          </p>

          <p className="txt">
            Then I ran the same breakdown for <em>sleep</em> — which explains{" "}
            <Anno src="[ratio]" pane="evidence-flatness">
              {th.variance_ratio}×
            </Anno>{" "}
            as much and has an obvious mechanism — and its profile is{" "}
            <em>just as flat</em>. Screen time&rsquo;s spread relative to its size is{" "}
            <Anno src="[spread]" pane="evidence-flatness">
              {t.flatness_audit.screen_spread}
            </Anno>
            ; sleep quality&rsquo;s is{" "}
            <Anno src="[spread]" pane="evidence-flatness">
              {t.flatness_audit.sleep_spread}
            </Anno>{" "}
            — slightly <em>more</em> uniform, not less. So flatness cannot tell a mechanism apart
            from the absence of one. It is a property of this questionnaire, whose items all move
            together against whatever you correlate them with.
          </p>

          <p className="txt">
            Which leaves a smaller, sturdier claim: <b>there is no symptom here to point at.</b> If
            you want to argue that screens damage teenagers in some particular way, this dataset
            cannot show you where — and it cannot show you where for sleep either. That is a limit
            of the instrument, and anyone claiming a mechanism from data like this runs into it.
          </p>

          <Expert title="the claim I had to withdraw here">
            <p>
              This is the second claim in this project that an audit demoted, and I would rather
              leave the trail visible than quietly restate it.
            </p>
            <Check label="what I wrote">
              That the flat loading was <em>&ldquo;the signature of a general response tendency
              rather than of a mechanism&rdquo;</em>. That reads flatness as informative about screen
              time specifically.
            </Check>
            <Check label="the test">
              Run the identical per-item breakdown for all five drivers in the file. Dispersion
              relative to size:{" "}
              {t.profiles
                .map((p) => `${p.label} ${p.spread_ratio}`)
                .join(", ")}
              . Share of total loading carried by the five strongest items: screen time{" "}
              <b>{t.flatness_audit.screen_top5}%</b>, sleep quality{" "}
              <b>{t.flatness_audit.sleep_top5}%</b>.
            </Check>
            <Check label="so">
              Sleep is at least as flat as screens on both measures. The original inference does not
              follow, and the piece now claims only that no symptom can be located — which is true,
              checkable, and about the questionnaire rather than about phones.
            </Check>
            <Check label="what survived">
              One genuine pattern did come out of it: item{" "}
              <b>{t.flatness_audit.shared_sleep_item}</b> is the strongest correlate of{" "}
              <em>every</em> sleep measure in the file — quality, hours, weekend midsleep, and social
              jetlag. The source ships the items unlabelled, so I will not guess what it asks.
            </Check>
          </Expert>

          <Expert title="ordinal data, overlapping intervals, and a subgroup check">
            <Check label="pearson?">
              The screen index is ordinal and the items run 0–3, so Pearson is defensible but not
              obviously right. Spearman agrees throughout: screen × total is{" "}
              <b>{sign(t.robustness.screen.spearman, 4)}</b> on ranks against{" "}
              <b>{sign(t.robustness.screen.pearson, 4)}</b> on values. Nothing in this piece turns
              on the choice.
            </Check>
            <Check label="is it really flat?">
              Per-item correlations run {sign(t.item_flatness.min, 4)} to{" "}
              {sign(t.item_flatness.max, 4)}, mean <b>{sign(t.item_flatness.mean, 4)}</b>, sd{" "}
              <b>{t.item_flatness.sd.toFixed(4)}</b>. Every item carries a 95% interval of roughly
              ±0.028 at this sample size, so almost all {t.source.items} overlap one another. The
              honest statement is not “all items are equal” but{" "}
              <b>“these data cannot distinguish them”</b> — which is the same obstacle anyone
              claiming a specific mechanism would face.
            </Check>
            <Check label="21 tests">
              No multiple-comparison correction is applied, and none is needed for the argument: I am
              not claiming any single item is significant. I am reporting a failure to find a
              standout, and corrections make that failure more likely, not less.
            </Check>
            <Check label="the drop series">
              Removing items shortens the questionnaire, so the rebuilt totals are not on one common
              scale and the correlations are not strictly comparable. The direction is still
              informative; the exact decline is not. Stated in the pipeline as{" "}
              <code>drop_series_caveat</code>.
            </Check>
            <Check label="subgroups">
              Split by sex, the association is essentially identical — boys{" "}
              <b>{sign(t.robustness.by_sex[0].pearson, 4)}</b> (n ={" "}
              {num(t.robustness.by_sex[0].n)}), girls{" "}
              <b>{sign(t.robustness.by_sex[1].pearson, 4)}</b> (n ={" "}
              {num(t.robustness.by_sex[1].n)}). A null result, reported because it was run.
            </Check>
          </Expert>

          <p className="kicker">
            the bridge · findings that force decisions <i />
          </p>
          <p className="txt dim">
            Change a number in the left column and the fable on the right has to be rewritten.
          </p>

          <div className="seam">
            {[
              [
                `The same ${num(t.source.subjects)} teenagers yield risk ratios from ${t.grid.rr_min.toFixed(2)}× to ${t.grid.rr_max.toFixed(2)}× across ${t.grid.cutoffs.length * t.grid.thresholds.length} combinations of two thresholds that are never reported.`,
                <>
                  The antagonist has to be <em>the line</em>, not the device. A story about a
                  villainous object would contradict the data; a story about a decision is what the
                  data actually shows.
                </>,
              ],
              [
                `Per-item loading is flat: mean ${sign(t.item_flatness.mean, 4)}, sd ${t.item_flatness.sd.toFixed(4)}, with ${t.item_flatness.inner_n} of ${t.source.items} items inside a band of ${(t.item_flatness.inner_hi - t.item_flatness.inner_lo).toFixed(4)}.`,
                <>
                  No single symptom may be named. Whoever measures in the story has to{" "}
                  <em>hope</em> for one clear answer and fail to find it — because that is what
                  happened here.
                </>,
              ],
              [
                `Sleep quality explains ${th.variance_ratio}× the variance screens do, and controlling hours slept absorbs ${sleep.absorbed_pct}% of the screen effect.`,
                <>
                  The real correlate must be <em>present in the story and ignored by everyone in
                  it</em> — said out loud once, late, and not written down.
                </>,
              ],
            ].map(([fact, decision], i) => (
              <div className="seam-row" key={i}>
                <div className="seam-cell">
                  <span>finding</span>
                  <p>{fact as string}</p>
                </div>
                <div className="seam-cell decision">
                  <span>decision</span>
                  <p>{decision}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── the fable ─────────────────────────────────────────────── */}
          <p className="kicker">
            the story <i />
          </p>
          <div className="tale">
            <h3 className="tale-h">The Line on the Wall</h3>
            <p className="tale-note">
              A fable. It contains no figures at all — the numbers have had their say already, and
              what is left of them here is only their shape.
            </p>

            <p className="txt">
              There was a town at the foot of a hill where, one spring, the children began to look
              tired.
            </p>

            <p className="txt">
              Not ill. Tired. They came down to breakfast slowly and went up to bed late and
              answered questions a beat after they were asked. It was the kind of thing that is
              obvious to everybody and provable by nobody, and so the town argued about it for a
              season without getting anywhere.
            </p>

            <p className="txt">
              What the council wanted was a number. How many of our children are unwell? Because
              you cannot put <em>they seem tired</em> in a ledger, and you cannot ask the province
              for help with a feeling.
            </p>

            <p className="txt">
              So they sent for a physician, and the physician came with a list of twenty-one
              questions.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              She asked every child all twenty-one, and wrote the answers down, and added them up,
              and each child came away with a tally. A small tally meant a child who answered the
              way children usually answer. A large one meant a child who did not.
            </p>

            <p className="txt">
              Then the council asked her for the number, and she said she could not give them one
              yet, because she had tallies and they had asked for a count.
            </p>

            <p className="txt">
              They did not follow, so she explained. There is no place inside a child where well
              becomes unwell. There is only the tally, which runs smoothly from the smallest to the
              largest with no gap anywhere along it. If you want a count, someone has to draw a line
              across the tally and say: above this, unwell. And that someone will be me, and I will
              be guessing.
            </p>

            <p className="txt">
              Draw it, said the council.
            </p>

            <p className="txt">
              So she went to the wall of the meeting hall, where the tallies had been chalked up
              from smallest to largest, and she drew a line across them, and above the line there
              were some children and below it there were many, and the council wrote down the
              number of the ones above and sent it to the province, and that was the count.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              By then the town had already decided what the cause was.
            </p>

            <p className="txt">
              A peddler had come through two years before selling small glass panes that lit up, and
              now every child in the town had one, and every parent could tell you exactly how late
              their child had been holding it. The panes were new. The tiredness was new. The
              council spent four meetings on the panes.
            </p>

            <p className="txt">
              Prove it, they told the physician. Show us the children with the panes are the ones
              above the line.
            </p>

            <p className="txt">
              And she said: I can show you that, and I would like you to watch how I do it.
            </p>

            <p className="txt">
              She went back to the wall. She rubbed out her line and drew a new one, lower, and said:
              here, nearly every child in the town is above the line, and the ones with the panes are
              only slightly more likely to be among them, and you would conclude that the panes
              hardly matter. Then she drew it higher, near the top, and said: here, very few children
              are above the line, but those few hold the panes far more often than the rest, and you
              would conclude that the panes are a catastrophe.
            </p>

            <p className="txt">
              She kept moving it. Each time she moved it she read out a sentence, and each sentence
              was true, and no two sentences agreed about how much the panes mattered.
            </p>

            <p className="txt">
              I can give you any answer you would like, she said, and I will not have lied to you
              once. Tell me which sentence you want and I will tell you where to put the line. What I
              cannot do is tell you where the line belongs, because it does not belong anywhere. It
              only has to be somewhere.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              One of the councillors — the youngest, who had been quiet — asked a better question.
              She asked: of your twenty-one questions, which one do the pane-holders answer worst?
            </p>

            <p className="txt">
              The physician said she had hoped very much that there would be an answer to that.
            </p>

            <p className="txt">
              Because one question would have been a mechanism. One question answered badly and the
              rest answered normally would have meant the panes were doing something in particular,
              and something in particular can be understood, and sometimes undone. She had gone
              through the twenty-one looking for it.
            </p>

            <p className="txt">
              What she found instead was that the pane-holders answered <em>every</em> question a
              little worse. Not one of them badly. All of them faintly, and by almost exactly the
              same faint amount, as though the panes did not cause any particular unhappiness but
              only made a child slightly readier to say yes to a long list of questions late in the
              evening.
            </p>

            <p className="txt">
              You could take away her worst question and ask the other twenty. The pattern held. You
              could take away ten. It held. There was nothing to remove, because there was nothing
              in any one place to begin with.
            </p>

            <p className="tale-break" aria-hidden>
              ⁂
            </p>

            <p className="txt">
              It was late, and the meeting had gone on, and the physician said one more thing before
              she packed up her list.
            </p>

            <p className="txt">
              She said: of everything I measured on your children, the panes moved the tally least.
              What moved it most, by a long way, was how they slept. And they are not sleeping. Some
              of that is the panes. A good deal of it is the new road, and the mill that runs at
              night, and the fact that half of them are up before it is light to work the terraces.
            </p>

            <p className="txt">
              Nobody wrote that down. There was no line for it, and no peddler to blame for it, and
              the road had been very expensive.
            </p>

            <p className="txt">
              The count went to the province, with the line where she had first drawn it, because a
              line has to be somewhere. The panes were forbidden by the following spring, and then
              permitted again the spring after, on the grounds that nothing much had changed.
            </p>

            <p className="txt">
              The children went on looking tired. The mill went on running. And in all of it, from
              the first meeting to the last, nobody thought to ask them what time they had gone to
              bed.
            </p>
          </div>

          <div className="notes">
            <p>
              <b>Source.</b> <i>{t.source.name}</i>, Kaggle — <code>{t.source.kaggle}</code>.
              Retrieved {t.source.retrieved}. {num(t.source.subjects)} teenagers (
              {num(t.source.boys)} boys, {num(t.source.girls)} girls), {t.source.items}{" "}
              questionnaire items. Pipeline:{" "}
              <button className="lnk" type="button" data-pane="build-py-02">
                analysis/pipelines/02_screen_time/build.py
              </button>
              , committed data:{" "}
              <button className="lnk" type="button" data-pane="data-json-02">
                data.json
              </button>
              .
            </p>
            <p>
              <b>Limits.</b> This is cross-sectional: nothing here can tell you which way any arrow
              points, and a teenager who is already unhappy may reach for a screen rather than the
              reverse. The partial correlations are not a causal adjustment; they show how much of a
              weak association travels with sleep, not that sleep is the cause. The questionnaire
              items ship unlabelled, so they are reported by number and never interpreted as
              specific symptoms. Every figure set in mono is traceable to the committed data file;
              the fable is fiction, and deliberately contains no figures at all.
            </p>
          </div>
        </>
      ),
    },

    "evidence-screen": {
      title: "evidence · screens against sleep",
      node: (
        <>
          <p className="txt dim">
            Every correlation is with the {t.source.items}-item questionnaire total, on the same{" "}
            {num(t.source.subjects)} teenagers. r² is the share of the differences between them that
            the measure accounts for.
          </p>
          <dl className="kv">
            {[
              ["screen_time_index", sign(th.screen_r, 4), `r² ${th.screen_r2_pct}%`, true],
              ["sleep_quality_index", sign(th.sleepq_r, 4), `r² ${th.sleepq_r2_pct}%`, true],
              ["avg_sleep_hours", sign(th.sleep_hours_r, 4), "", false],
            ].map(([k, v, extra, hit]) => (
              <div key={k as string} className={hit ? "hit" : undefined}>
                <dt>
                  {k as string} {extra ? <em>· {extra as string}</em> : null}
                </dt>
                <dd>{v as string}</dd>
              </div>
            ))}
          </dl>
          <p className="tile-cap">
            Sleep quality accounts for <b>{th.variance_ratio}×</b> the variance screen time does.
          </p>

          <p className="kicker">
            how much of the screen effect travels with sleep <i />
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>held constant</th>
                  <th>screen × it</th>
                  <th>partial r</th>
                  <th>absorbed</th>
                </tr>
              </thead>
              <tbody>
                {t.partials.map((p) => (
                  <tr key={p.control} className={p.control === "avg_sleep_hours" ? "hit" : undefined}>
                    <td>{p.control}</td>
                    <td>{sign(p.screen_x_control, 4)}</td>
                    <td>{sign(p.partial, 4)}</td>
                    <td>{p.absorbed_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tile-cap">
            Starting from {sign(th.screen_r, 4)}. Holding hours slept constant absorbs{" "}
            <b>{sleep.absorbed_pct}%</b> of it. This is a decomposition, not a causal claim — see
            the limits note on the piece.
          </p>
        </>
      ),
    },

    "evidence-cutoff": {
      title: "evidence · where the line falls",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            The distribution of questionnaire totals across all {num(t.source.subjects)}{" "}
            teenagers. It runs smoothly from {t.source.bdi_min} to {t.source.bdi_max} with no gap
            anywhere — there is no natural place in it where “well” becomes “unwell”. The orange bar
            is the line the source file draws, at {th.cutoff_in_file}.
          </p>
          <div className="tile">
            <span className="sig" aria-hidden>
              {t.bdi_hist.map((v, i) => (
                <i
                  key={i}
                  className={i === th.cutoff_in_file ? "mark" : undefined}
                  style={{
                    height: `${Math.max(2, (v / Math.max(...t.bdi_hist)) * 100)}%`,
                  }}
                />
              ))}
            </span>
            <span className="axis">
              <span>total {t.source.bdi_min}</span>
              <span>
                median {t.source.bdi_median} · mean {t.source.bdi_mean}
              </span>
              <span>{t.source.bdi_max}</span>
            </span>
          </div>
          <dl className="kv">
            {[
              ["cutoff used by the file", String(th.cutoff_in_file)],
              ["teenagers at or above it", `${num(th.n_flagged)} of ${num(t.source.subjects)}`],
              ["share flagged", `${th.share_flagged}%`],
              ["questionnaire range", `${t.source.bdi_min} – ${t.source.bdi_max}`],
              ["median total", String(t.source.bdi_median)],
              ["mean total", String(t.source.bdi_mean)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="kicker">
            the cutoff was verified, not assumed <i />
          </p>
          <p className="txt dim">
            The source ships a binary <code>depressed</code> column without stating what produced
            it. So the pipeline tries every cutoff in range and reports how well each reproduces
            that column across all {num(t.source.subjects)} rows. Exactly one is perfect, and the
            build asserts it — if a future version of the dataset changed the line, the pipeline
            would fail rather than quietly publish a wrong claim.
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>cutoff</th>
                  <th>agreement with the file&rsquo;s own column</th>
                </tr>
              </thead>
              <tbody>
                {t.cutoff_check
                  .filter((c) => c.agreement > 0.9)
                  .map((c) => (
                    <tr key={c.cutoff} className={c.agreement === 1 ? "hit" : undefined}>
                      <td>bdi_total ≥ {c.cutoff}</td>
                      <td>{(c.agreement * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="tile-cap">
            <code>bdi_total ≥ {th.cutoff_verified}</code> reproduces the column exactly (
            {(th.cutoff_agreement * 100).toFixed(0)}%). The next best, {th.cutoff_runner_up}, gets{" "}
            {(th.cutoff_runner_up_agreement * 100).toFixed(2)}% — close, and wrong.
          </p>
        </>
      ),
    },

    "evidence-flatness": {
      title: "evidence · every driver, item by item",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            The same per-item breakdown, run for all five drivers in the file. If a flat profile were
            evidence against a mechanism, sleep — eight times stronger, with an obvious mechanism —
            ought to look different. It does not.
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>driver</th>
                  <th>mean r</th>
                  <th>sd</th>
                  <th>spread ÷ size</th>
                  <th>top-5 share</th>
                  <th>strongest item</th>
                </tr>
              </thead>
              <tbody>
                {t.profiles.map((p) => (
                  <tr
                    key={p.driver}
                    className={
                      p.driver === "screen_time_index" || p.driver === "sleep_quality_index"
                        ? "hit"
                        : undefined
                    }
                  >
                    <td>{p.label}</td>
                    <td>{sign(p.mean, 4)}</td>
                    <td>{p.sd.toFixed(4)}</td>
                    <td>{p.spread_ratio}</td>
                    <td>{p.top5_share_pct}%</td>
                    <td>{String(p.strongest_item).padStart(2, "0")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tile-cap">
            <b>spread ÷ size</b> is the standard deviation of the {t.source.items} correlations
            divided by their mean, so drivers of very different strength can be compared. Screen time{" "}
            <b>{t.flatness_audit.screen_spread}</b>, sleep quality{" "}
            <b>{t.flatness_audit.sleep_spread}</b>. Social jetlag, the weakest driver in the file, is
            the <em>least</em> uniform of the five — the opposite of what the discarded reading would
            predict.
          </p>

          <p className="kicker" style={{ marginTop: "1.8rem" }}>
            the one item that does stand out <i />
          </p>
          <p className="txt dim">
            Item {t.flatness_audit.shared_sleep_item} is the strongest correlate of every sleep
            measure here, all four of them. That is a real pattern rather than an artefact of one
            noisy column. The source ships the items unlabelled, so what it asks is not something I
            can tell you.
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>driver</th>
                  <th>strongest</th>
                  <th>its r</th>
                  <th>weakest</th>
                </tr>
              </thead>
              <tbody>
                {t.profiles.map((p) => (
                  <tr
                    key={p.driver}
                    className={
                      p.strongest_item === t.flatness_audit.shared_sleep_item ? "hit" : undefined
                    }
                  >
                    <td>{p.label}</td>
                    <td>item {String(p.strongest_item).padStart(2, "0")}</td>
                    <td>{sign(p.items[p.strongest_item - 1], 4)}</td>
                    <td>item {String(p.weakest_item).padStart(2, "0")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    },

    "evidence-intervals": {
      title: "evidence · which ratios survive an interval",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            Every cell of the grid, at the source file&rsquo;s own heavy-user threshold of{" "}
            {t.grid.default_threshold}, with a 95% interval from the Katz log method. Rows in orange
            are the ones whose interval includes 1 — arithmetically correct, and indistinguishable
            from no difference at all.
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>cutoff</th>
                  <th>ratio</th>
                  <th>95% interval</th>
                  <th>heavy flagged</th>
                  <th>others flagged</th>
                </tr>
              </thead>
              <tbody>
                {t.grid.cells
                  .find((b) => b.threshold === t.grid.default_threshold)!
                  .row.map((c, i) => (
                    <tr key={i} className={c.solid ? undefined : "hit"}>
                      <td>≥ {t.grid.cutoffs[i]}</td>
                      <td>{c.rr?.toFixed(2)}×</td>
                      <td>
                        {c.ci[0]?.toFixed(2)}× – {c.ci[1]?.toFixed(2)}×
                      </td>
                      <td>{num(c.nh_flagged)}</td>
                      <td>{num(c.nl_flagged)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <dl className="kv">
            {[
              ["cells in the whole grid", num(t.robustness.grid_cells)],
              [
                "interval clear of 1",
                `${num(t.robustness.grid_solid)} (${t.robustness.grid_solid_pct}%)`,
              ],
              [
                "interval includes 1",
                `${num(t.robustness.grid_cells - t.robustness.grid_solid)} (${(
                  100 - t.robustness.grid_solid_pct
                ).toFixed(1)}%)`,
              ],
              ["ratio range", `${t.grid.rr_min}× – ${t.grid.rr_max}×`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="tile-cap">
            The weak cells cluster at the extremes, where the flagged group shrinks to a few dozen
            teenagers. That is exactly where the most quotable ratios live.
          </p>
        </>
      ),
    },

    notebook: {
      title: "audit.ipynb",
      kind: "wide",
      node: (
        <>
          <p className="lede">
            Every published figure, re-derived from the raw source by something that
            isn&rsquo;t the pipeline.
          </p>
          <p className="txt dim">
            A pipeline that emits its own numbers cannot establish that they are right — it can only
            be self-consistent. So there is a notebook that reads the raw Kaggle files and the
            committed <code>data.json</code>, recomputes each claim from scratch, and asserts the two
            agree.
          </p>
          <p className="txt">
            It deliberately does <em>not</em> import <code>build.py</code>. The pipelines are stdlib;
            the notebook is pandas and numpy. Where two implementations agree, the number is not an
            artefact of either one.
          </p>

          <div className="ledger">
            <div>
              <b>{audit.passed}</b>
              <span>claims re-derived</span>
            </div>
            <div>
              <b>{audit.checks}</b>
              <span>checks run</span>
            </div>
            <div>
              <b>{audit.failed.length}</b>
              <span>failing</span>
            </div>
          </div>

          <p className="txt dim">
            It also checks the places where the site admits a weakness, because an admission is a
            claim too. The scale-dependent residual in piece 01 is recomputed both ways — rank{" "}
            <b>{w.robustness.subject.shipped_rank}</b> under the shipped scaling,{" "}
            <b>{w.robustness.subject.ols_rank}</b> under least squares — and the withdrawn flatness
            inference in piece 02 is verified as withdrawn: sleep&rsquo;s profile really is at least
            as uniform as screen time&rsquo;s.
          </p>

          <p className="txt dim">
            The whole notebook is below — all {audit.cell_count} cells, with the output each one
            actually produced when <code>make_audit.py</code> ran it. Nothing here is transcribed by
            hand, and no line of it is a screenshot.
          </p>

          <Notebook />

          <p className="path">
            analysis/notebooks/audit.ipynb · generated by make_audit.py · {audit.stack}
          </p>
          <p className="txt dim">
            Two guards, different jobs:{" "}
            <button className="lnk" type="button" data-pane="verify">
              verify.py
            </button>{" "}
            checks that the committed data still comes out of the pipelines; this checks that the
            sentences still match the data.
          </p>
        </>
      ),
    },

    verify: {
      title: "verify.py",
      kind: "wide",
      node: (
        <>
          <p className="lede">
            The pipelines are never run automatically. This checks them instead.
          </p>
          <p className="txt dim">
            It would be easy to have a scheduled job re-run both pipelines and commit whatever came
            out. That would be a mistake. The prose on this site is written around specific
            findings — “not weak, inverted”, “the only negative one”, two fables — and no automation
            can rewrite a fable when a number moves. Auto-publishing would put new numbers
            underneath old sentences, which is the exact failure this whole site is built to avoid.
          </p>
          <p className="txt">
            So nothing here ever writes to <code>web/content</code>. It re-runs both pipelines and
            reports whether the committed data still reproduces, naming three failures apart:
          </p>
          <dl className="kv">
            {[
              [
                "drift",
                "the upstream dataset changed, so the numbers moved. Someone has to re-run the pipeline and then re-read every sentence citing it.",
              ],
              [
                "tamper",
                "a data.json was edited by hand. The promise of this site is that those files come out of the pipelines.",
              ],
              [
                "break",
                "a pipeline assertion failed — for instance the depressed column stopped being bdi_total ≥ 14.",
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd style={{ maxWidth: "26rem", whiteSpace: "normal", textAlign: "left" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <pre className="code">{`$ python analysis/verify.py

─── 01-ai-exposure ───
OK       4268 values, identical to the commit

─── 02-screen-time ───
OK       1442 values, identical to the commit

PASS  every committed data.json reproduces exactly.`}</pre>
          <p className="path">analysis/verify.py</p>
          <p className="txt dim">
            Run as a pull-request gate, this catches drift and tampering without ever publishing
            either. There is no backend and no database anywhere in this project: the data is
            computed ahead of time, committed as JSON, and served as static files.
          </p>
        </>
      ),
    },

    "data-json-02": {
      title: "data.json — 02-screen-time",
      node: (
        <>
          <p className="txt dim">
            One committed file, again the only contract between the analysis and this site. It
            carries the whole precomputed grid, which is why the sliders on the piece can be
            interactive without the page ever calculating anything.
          </p>
          <dl className="kv">
            {[
              ["source.subjects", num(t.source.subjects)],
              ["source.items", String(t.source.items)],
              ["headline.screen_r", sign(th.screen_r, 4)],
              ["headline.sleepq_r", sign(th.sleepq_r, 4)],
              ["headline.variance_ratio", `${t.headline.variance_ratio}×`],
              ["grid.cutoffs[]", `${t.grid.cutoffs.length} values`],
              ["grid.thresholds[]", `${t.grid.thresholds.length} values`],
              [
                "grid.cells",
                `${t.grid.cutoffs.length * t.grid.thresholds.length} precomputed results`,
              ],
              ["grid.rr_min / rr_max", `${t.grid.rr_min} / ${t.grid.rr_max}`],
              ["items[]", `${t.items.length} per-item correlations`],
              ["drop_series[]", `${t.drop_series.length} robustness steps`],
              ["bdi_hist[]", `${t.bdi_hist.length} bins`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="path">web/content/02-screen-time/data.json</p>
        </>
      ),
    },

    "build-py-02": {
      title: "build.py — 02-screen-time",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            The interactive parts of piece 02 are shaped by the same rule as everything else here:
            the web layer computes nothing. This is the loop that precomputes every position both
            sliders can take.
          </p>
          <pre className="code">{`# the grid: every headline this dataset can honestly produce
cells = []
for k in THRESHOLDS:
    heavy = [r for r in rows if r["screen_time_index"] >= k]
    light = [r for r in rows if r["screen_time_index"] <  k]
    row = []
    for cut in CUTOFFS:
        ph = sum(1 for r in heavy if r["bdi_total"] >= cut) / len(heavy)
        pl = sum(1 for r in light if r["bdi_total"] >= cut) / len(light)
        row.append({
            "rr": round(ph / pl, 3) if pl > 0 else None,
            "ph": round(100 * ph, 2),
            "pl": round(100 * pl, 2),
            "nh_flagged": sum(1 for r in heavy if r["bdi_total"] >= cut),
            "nl_flagged": sum(1 for r in light if r["bdi_total"] >= cut),
        })
    cells.append({"threshold": k, "n_heavy": len(heavy),
                  "n_light": len(light), "row": row})`}</pre>
          <p className="path">analysis/pipelines/02_screen_time/build.py</p>
          <p className="txt dim">
            {t.grid.thresholds.length} thresholds × {t.grid.cutoffs.length} cutoffs ={" "}
            {t.grid.cutoffs.length * t.grid.thresholds.length} cells, each carrying its ratio, both
            percentages, and both flagged counts. stdlib Python, with no dependency besides{" "}
            <code>kagglehub</code>.
          </p>
        </>
      ),
    },

    /* ── files ────────────────────────────────────────────────────────── */
    method: {
      title: "method",
      node: (
        <>
          <p className="txt dim">
            The same four layers in every piece, always in this order. Only the data changes — and
            the shape of the opening, which is chosen by the shape of the data rather than by taste.
          </p>
          <div className="rows">
            {[
              [
                "Findings",
                "Real analysis of public data. The pipeline is linked, the source is named, and every calculation can be re-run from zero.",
              ],
              [
                "The bridge",
                "A plain table: which finding forced which narrative decision. This is the layer that separates data as a foundation from data as decoration.",
              ],
              [
                "The story",
                "Stands on its own as fiction. No charts, no explanation, no moral stapled to the end.",
              ],
              [
                "Evidence",
                "Any figure set in mono opens its own column to the right — the underlying value, the table, the file — without leaving the sentence.",
              ],
            ].map(([t, d], i) => (
              <div className="row" key={t}>
                <span className="row-k">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="row-t">{t}</span>
                  <span className="row-s">{d}</span>
                </span>
                <span className="row-go" />
              </div>
            ))}
          </div>
          <p className="kicker">
            one typographic rule <i />
          </p>
          <p className="txt">
            Everywhere on this site, <code>a figure set in mono</code> is traceable to a source
            file. Text set in serif was written. There are no exceptions, including inside the
            fiction — so a sentence can be read at once as literature and as a checkable claim.
          </p>
        </>
      ),
    },

    "data-json": {
      title: "data.json",
      node: (
        <>
          <p className="txt dim">
            One committed file is the only contract between the analysis and this site. The web
            layer computes nothing of its own.
          </p>
          <dl className="kv">
            {[
              ["source.name", w.source.name],
              ["source.kaggle", w.source.kaggle],
              ["source.retrieved", w.source.retrieved],
              ["source.occupations", num(w.source.occupations)],
              ["source.employment_covered", num(w.source.employment_covered)],
              ["abilities[]", `${w.abilities.length} abilities`],
              ["subject_profile[]", `${w.subject_profile.length} rows`],
              ["slope.pairs[]", `${w.slope.pairs.length} rank pairs`],
              ["opening.cloud[]", `${w.opening.cloud.length} occupations`],
              ["findings.layers_disagree", sign(f.layers_disagree)],
              ["findings.layers_r2", num(f.layers_r2, 3)],
              ["findings.exposure_wage_pearson", sign(f.exposure_wage_pearson)],
              ["findings.originality_exposure", sign(f.originality_exposure)],
              ["findings.most_exposed_ability", f.most_exposed_ability],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="path">web/content/01-ai-exposure/data.json</p>
        </>
      ),
    },

    "build-py": {
      title: "build.py",
      kind: "wide",
      node: (
        <>
          <p className="txt dim">
            Every calculation on this site comes from one file that can be re-run from zero. This is
            a real excerpt of it.
          </p>
          <pre className="code">{PIPELINE}</pre>
          <p className="path">analysis/pipelines/01_ai_exposure/build.py</p>
          <p className="txt dim">
            Each occupation&rsquo;s predicted exposure is a weighted mean of the{" "}
            {w.abilities.length} ability-exposure scores, weighted by how much that occupation
            demands each ability, then rescaled onto the rating scale before residuals are taken.
            stdlib Python, with no dependency besides <code>kagglehub</code>.
          </p>
        </>
      ),
    },

    contact: {
      title: "contact",
      node: (
        <>
          <Copy className="lede" html={site.contact.lede} />
          <ul className="links">
            {site.links.map((l) => (
              <li key={l.label}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
          <p className="kicker">
            colophon <i />
          </p>
          <Copy className="txt dim" html={site.contact.colophon} />
        </>
      ),
    },
  };

/**
 * Which panes open from which.
 *
 * Declared rather than derived, because it decides what gets pre-rendered as
 * real HTML — and the whole point of the routing is that a crawler, or a reader
 * with JavaScript off, finds the writing instead of an empty shell. Every edge
 * here becomes a two-segment static route; every pane becomes a one-segment
 * one. `assertGraph` fails the build if this drifts from `panes`.
 */
export const PANE_LINKS: Record<string, string[]> = {
  "piece-01": [
    "evidence-two-layers",
    "evidence-abilities",
    "evidence-writers",
    "evidence-profile",
    "evidence-pay",
    "evidence-extremes",
    "evidence-raters",
  ],
  "piece-02": [
    "evidence-screen",
    "evidence-cutoff",
    "evidence-intervals",
    "evidence-flatness",
    "data-json-02",
    "build-py-02",
  ],
  notebook: ["verify"],
};

/** Every trail worth its own HTML file: each pane, plus each real edge. */
export function paneTrails(): string[][] {
  const out: string[][] = [];
  for (const id of Object.keys(panes)) {
    if (id === "index") continue; // that one is app/page.tsx
    out.push([id]);
    for (const child of PANE_LINKS[id] ?? []) out.push([id, child]);
  }
  return out;
}

export function assertGraph() {
  for (const [from, tos] of Object.entries(PANE_LINKS)) {
    if (!panes[from]) throw new Error(`PANE_LINKS names a missing pane: ${from}`);
    for (const to of tos) {
      if (!panes[to]) throw new Error(`PANE_LINKS: ${from} -> missing pane ${to}`);
    }
  }
}

/** One-line description per pane, for per-route metadata. */
export const PANE_BLURB: Record<string, string> = {
  index: "Open data, followed all the way down to one person inside it.",
  "piece-01":
    "One dataset scores AI exposure twice and the two answers point in opposite directions. The job they disagree about most, of 271, is writing.",
  "piece-02":
    "Before anyone can say heavy screen users are N times more likely to be depressed, two lines have to be drawn — and published claims report neither.",
  notebook:
    "Every published figure re-derived from the raw source, in pandas, without the pipeline.",
  verify: "Re-runs both pipelines and refuses to publish anything that drifted.",
  method: "Four layers, in the same order every time.",
  contact: "A portfolio of data analysis and narrative writing.",
};
