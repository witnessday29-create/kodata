import { wages, num, sign } from "@/lib/works";
import { Intro } from "@/components/Intro";
import { Expert, CI, Check } from "@/components/Expert";
import { Anno } from "@/components/Anno";
import type { PaneDef } from "@/components/Stack";

/**
 * Piece 03 and its evidence, kept in its own module.
 *
 * panes.tsx held pieces 01 and 02 and had reached 2,400 lines. A third piece in
 * the same file would have made the registry unreadable, and the registry is
 * the one place a reader of this codebase needs to be able to scan. The pane
 * ids and the graph in PANE_LINKS still live there; only the nodes moved.
 */

const k = wages;
const h = k.headline;
const g = k.integrity;
const sub = k.subject;
const one = k.elasticity.province_fe;
const two = k.elasticity.twoway_fe;
const first = k.persons.by_year[0];
const last = k.persons.by_year[k.persons.by_year.length - 1];
const peak = k.persons.by_year.reduce((a, b) => (b.median > a.median ? b : a));
const engelLast = k.engel.filter((e) => e.year === Math.max(...k.engel.map((x) => x.year)));
const urban = engelLast.find((e) => e.area === "PERKOTAAN")!;
const rural = engelLast.find((e) => e.area === "PERDESAAN")!;
const floorFirst = k.floor.series[0];
const floorLast = k.floor.series[k.floor.series.length - 1];
const disp = k.dispersion.series;
const rp = k.dispersion.persistence;

const rupiah = (n: number) => "Rp " + num(n);

/** The distribution of persons-per-wage, with the subject's latest year marked. */
function Spread({ mark }: { mark?: number }) {
  const top = Math.max(...k.hist.counts);
  const at = mark ?? k.hist.mark;
  return (
    <span className="sig" aria-hidden>
      {k.hist.counts.map((v, i) => (
        <i
          key={i}
          className={i === at ? "mark" : undefined}
          style={{ height: `${Math.max(2, (v / top) * 100)}%` }}
        />
      ))}
    </span>
  );
}

export const piece03: Record<string, PaneDef> = {
  /* ── the piece ──────────────────────────────────────────────────────── */
  "piece-03": {
    title: k.title,
    node: (
      <>
        <Intro
          dataset={k.source.name}
          kaggle={k.source.kaggle}
          retrieved={k.source.retrieved}
          what={
            <>
              <p>
                Four tables covering the {k.source.provinces} provinces of Indonesia. The legal
                minimum wage a province may pay, once a year from {k.source.ump_from} to{" "}
                {k.source.ump_to}. The poverty line, twice a year from {k.source.gk_from}, split
                into food and non-food and into town and countryside. What people actually spend,
                split the same way. And the hourly wage employees actually receive.
              </p>
              <p>
                The wage is per worker per month. The poverty line and the spending are per{" "}
                <em>person</em> per month. That mismatch of denominators is not a nuisance here —
                it is the whole instrument. One row is one province.
              </p>
            </>
          }
          abstract={
            <>
              <p>
                A minimum wage is an answer to a question: what does it cost to live here? Divide
                it by the cost of one person and the answer arrives in a unit anybody can picture.
                In the median province one minimum wage holds{" "}
                {last.median.toFixed(2)} people above the poverty line — and across the panel the
                figure runs from {h.persons_min.toFixed(2)} to {h.persons_max.toFixed(2)}. The same
                legal category, meaning very different things in different places, and the spread
                has not narrowed in {last.year - first.year} years.
              </p>
              <p>
                Then the harder result. Regressed with province fixed effects, the wage tracks its
                province&rsquo;s own poverty line almost exactly ({sign(one.beta, 3)}). Add year
                fixed effects and the relationship vanishes ({sign(two.beta, 3)}, interval crossing
                zero). The apparent tracking was the national inflation trend the whole time. A
                wage set by a national formula cannot track a local cost, and this is that fact
                arriving as a coefficient.
              </p>
              <p>
                Before any of it: the file carries a national aggregate among its provinces, and
                one of its wage columns is scrambled. Both are shown rather than silently repaired.
              </p>
            </>
          }
          asks={[
            <>If a minimum wage is priced in months of one person&rsquo;s survival, how many people does one actually buy?</>,
            <>Does the wage a province sets respond to what living in that province costs?</>,
            <>Is there a way to check that does not require anybody to draw a poverty line at all?</>,
            <>Is the legal floor still a floor, or has it become the going rate?</>,
          ]}
          files={k.source.files.map((f) => ({
            name: f.name,
            rows: num(f.rows),
            cols: f.name.endsWith(".df.csv") ? "3–6" : "9–157",
            unit: f.unit,
            used:
              f.name === "ump.csv"
                ? "provinsi and every ump.<year> column, in the file's own row order"
                : f.name === "gk.df.csv"
                ? "provinsi, jenis, daerah, tahun, periode, gk"
                : f.name === "peng.df.csv"
                ? "provinsi, daerah, jenis, tahun, peng"
                : "provinsi, tahun, upah",
          }))}
          caveat={
            <>
              A household of four shares a roof, a stove and a rice cooker, so a per-person line
              multiplied by four overstates what four people cost.{" "}
              <b>This ratio therefore understates how many a wage can hold.</b> It also assumes one
              earner. Indonesia&rsquo;s average household size is <em>not in this file</em> and is
              never multiplied in anywhere — the pipeline emits people and stops, so the comparison
              to a household is yours to make and yours to source. And the year the file gets wrong
              is excluded from every figure here except the one that condemns it.
            </>
          }
        />

        <p className="kicker">
          piece 03 · the premise <i />
        </p>
        <p className="lede">
          A minimum wage is a number that claims to know what living costs. Put it next to the
          official price of staying alive and it starts answering in people.
        </p>

        <p className="txt">
          Indonesia sets its minimum wage province by province, so there are{" "}
          {k.source.provinces} of them. It also publishes, province by province, the{" "}
          <em>garis kemiskinan</em> — the monthly rupiah below which one person counts as poor.
          Both are monthly. Both are in rupiah. One is per worker and one is per person, so
          dividing the first by the second gives a count of human beings: how many people one legal
          minimum wage can hold above the official floor.
        </p>

        <p className="txt">
          In {last.year} the median province came to{" "}
          <Anno src="[persons.by_year]" pane="evidence-people">
            {last.median.toFixed(2)} people
          </Anno>
          . The best-off province managed {last.max.toFixed(2)}. The worst managed{" "}
          {last.min.toFixed(2)}. Across all{" "}
          {num(h.province_years)} province-years in the clean panel,{" "}
          <Anno src="[persons.thresholds]" pane="evidence-people">
            {h.under_five_pct}%
          </Anno>{" "}
          sit below five people and {h.under_four_pct}% below four.
        </p>

        <div className="tile">
          <Spread />
          <span className="axis">
            <span>0</span>
            <span>
              people one minimum wage holds above the poverty line, all{" "}
              {num(h.province_years)} province-years · orange = {sub.province},{" "}
              {sub.latest.year}
            </span>
            <span>{k.hist.top}</span>
          </span>
        </div>

        <p className="kicker">
          before anything: what is wrong with the file <i />
        </p>

        <p className="txt">
          The file has {g.n_provinces + 1} rows and calls them all provinces. One of them is{" "}
          <code>{k.source.national_row}</code> — the national aggregate, sitting in the same column
          as the units it aggregates. Left in, it quietly bends every spread, every correlation and
          every extreme in this piece.{" "}
          <Anno src="[source.national_row]" pane="evidence-national">
            It is removed
          </Anno>
          , and the {g.n_provinces} that remain are the provinces.
        </p>

        <p className="txt">
          Worse, the {g.excluded_year} minimum-wage column is wrong for{" "}
          <Anno src="[integrity.n_violations]" pane="evidence-2021">
            {g.n_violations} of {g.n_provinces} provinces
          </Anno>
          . Not wrong in a way that needs an outside source to catch: {g.n_traced} of those
          provinces are holding, to within two rupiah, <em>another province&rsquo;s</em> wage. The
          year is excluded from everything above. What survives the exclusion is the real{" "}
          {g.excluded_year}, and it is a good deal starker than a data error —{" "}
          {g.frozen_exactly} of the {g.clean_rows} uncorrupted provinces did not raise the minimum
          wage by a single rupiah.
        </p>

        <p className="kicker">
          the finding · a wage that stopped listening <i />
        </p>

        <p className="txt">
          If the minimum wage were answering the cost-of-living question, the ratio above would be
          roughly flat across provinces: expensive places would pay more, cheap places less, and
          the number of people a wage holds would come out similar everywhere. It is not flat. Its
          coefficient of variation is{" "}
          <Anno src="[persons.by_year.cv]" pane="evidence-spread">
            {last.cv.toFixed(3)}
          </Anno>
          , essentially unchanged from {first.cv.toFixed(3)} in {first.year}.
        </p>

        <p className="txt">
          Two more measures say the same thing louder. Dispersion of the wage itself, as a Theil
          index, has been flat for {disp[disp.length - 1].year - disp[0].year} years —{" "}
          <Anno src="[dispersion.series]" pane="evidence-spread">
            {h.theil_first.toFixed(5)} in {disp[0].year}, {h.theil_last.toFixed(5)} in{" "}
            {disp[disp.length - 1].year}
          </Anno>
          . And the ranking of provinces barely moves: the order in {rp.first_year} predicts the
          order in {rp.last_year} at {sign(rp.spearman, 3)}. Whatever this is, it is a structure,
          not a drift.
        </p>

        <p className="txt">
          Now the measurement that matters. Regress the log wage on the log poverty line with a
          fixed effect for each province — the standard way to ask whether a province&rsquo;s wage
          follows its own costs — and the answer looks like a resounding yes:{" "}
          <Anno src="[elasticity.province_fe]" pane="evidence-tracking">
            {sign(one.beta, 3)}
          </Anno>
          , a near-perfect one-for-one. Then add a fixed effect for each year, which removes
          whatever was happening to the whole country at once. The coefficient collapses to{" "}
          <Anno src="[elasticity.twoway_fe]" pane="evidence-tracking">
            {sign(two.beta, 3)}
          </Anno>
          , with an interval that comfortably contains zero.
        </p>

        <p className="txt">
          The first estimate was measuring inflation. Both series climb together year after year,
          and a province fixed effect does nothing to separate a common national climb from a local
          response. Once the year is held constant, a province&rsquo;s wage carries no information
          about what that province costs. Which is exactly what you would predict of a wage set by
          national formula rather than by local price — and Indonesia has set it that way, by
          formula, since 2016.
        </p>

        <Expert>
          <Check label="estimator">
            Two-way within estimator, by iterated demeaning of both logs over province and year
            until the sweeps stop moving. Equivalent to province and year dummies, without building
            them.
          </Check>
          <Check label="standard errors">
            A wage is set once a year and almost never cut, so a province&rsquo;s residual this
            year says plenty about its residual next year, and conventional errors are too small.
            Both are emitted; the piece quotes the cluster-robust one, clustered on province (
            {two.clusters} clusters, CR1 correction). Province FE: se {one.se.toFixed(3)} →{" "}
            {one.se_cluster.toFixed(3)}. Two-way: se {two.se.toFixed(3)} →{" "}
            {two.se_cluster.toFixed(3)}.
          </Check>
          <Check label="the two intervals">
            Province FE {sign(one.beta, 3)}, <CI lo={one.beta - 1.96 * one.se_cluster} hi={one.beta + 1.96 * one.se_cluster} />. Two-way{" "}
            {sign(two.beta, 3)}, <CI lo={two.ci_cluster[0]} hi={two.ci_cluster[1]} />. The second
            interval contains zero, so the honest statement is <em>no detectable relationship</em>,
            not a negative one.
          </Check>
          <Check label="what would break it">
            A two-way estimate reliably away from zero — in either direction — on a longer panel or
            a different poverty series. The available overlap is only{" "}
            {k.source.years_used.length} usable years, which is thin, and thinness is why the
            interval is wide rather than why it contains zero.
          </Check>
          <Check label="cross-section, for scale">
            Between provinces in a single year the wage and the line correlate around{" "}
            {k.elasticity.cross_section[0].r.toFixed(2)}, with the line accounting for a median{" "}
            {h.cross_r2_pct}% of wage variation. So even ignoring time, most of what sets a
            province&rsquo;s minimum wage is not what that province costs.
          </Check>
          <Check label="not a causal claim">
            Neither direction is identified here. A poverty line is itself partly a function of
            local prices that wages help set. This is a description of whether two published series
            move together, and nothing more.
          </Check>
        </Expert>

        <p className="kicker">
          a check that draws no line at all <i />
        </p>

        <p className="txt">
          Every figure so far leans on the poverty line, and a poverty line is something somebody
          chose. There is one way to check welfare here without choosing anything: Engel&rsquo;s
          law, the most durable regularity in the whole of household economics. The poorer a
          household, the larger the share of its spending that goes on food. No line required —
          just a ratio.
        </p>

        <p className="txt">
          The file lets that ratio be computed twice: for what people actually spend, and for the
          poverty line itself. In {urban.year} the median urban household spent{" "}
          <Anno src="[engel]" pane="evidence-engel">
            {(urban.spending_food_share * 100).toFixed(1)}%
          </Anno>{" "}
          of its money on food, and the median rural household{" "}
          {(rural.spending_food_share * 100).toFixed(1)}%. The poverty line for the same places and
          the same year is {(urban.line_food_share! * 100).toFixed(1)}% and{" "}
          {(rural.line_food_share! * 100).toFixed(1)}% food.
        </p>

        <p className="txt">
          The line is describing a basket nobody buys, and the gap has held near{" "}
          {(urban.gap! * 100).toFixed(0)} points for as long as both series exist. That is not
          drift; it is construction. The poverty line is not a measurement of how the poor live. It
          is a stipulation of what surviving would cost if you spent like nobody does — which is
          worth knowing before treating a poverty count as an observation about the world.
        </p>

        <p className="kicker">
          the floor, and what is happening to it <i />
        </p>

        <p className="txt">
          One last series. Alongside the legal minimum, the file carries the wage employees are
          actually paid, by the hour. Put it on the same monthly footing —{" "}
          {k.floor.hours} hours, the statutory full-time month — and compare.
        </p>

        <p className="txt">
          In {floorFirst.year} the median province&rsquo;s actual wage stood at{" "}
          <Anno src="[floor.series]" pane="evidence-floor">
            {floorFirst.median.toFixed(2)}×
          </Anno>{" "}
          its legal minimum, and no province was below it. By {floorLast.year} the median had fallen
          to {floorLast.median.toFixed(2)}× and{" "}
          <Anno src="[floor.series]" pane="evidence-floor">
            {floorLast.below_minimum} provinces
          </Anno>{" "}
          had an average employee wage <em>beneath</em> their own legal floor. A minimum is
          becoming a maximum.
        </p>

        <Expert title="what the hourly figure assumes">
          <Check label="the unit">
            The file names this column <code>upah</code> and does not say what it is denominated
            in. It is read as rupiah per hour. The only evidence is internal: multiplied by the
            statutory {k.floor.hours}-hour month it lands within a quarter of the legal minimum in
            every province-year, which no other plausible unit does.
          </Check>
          <Check label="who is in it">
            An average across employees is not a count of underpaid workers. A province can average
            above the minimum while many individuals sit below it, and an average below the minimum
            need not mean most workers are underpaid — part-time and informal arrangements are in
            here and the minimum does not bind them the same way.
          </Check>
          <Check label="what would break it">
            The unit being something else — a weekly or daily figure — which would make the level
            meaningless. The <em>direction</em> would survive it: the ratio falls over time on any
            fixed multiplier, because a constant cannot create a trend.
          </Check>
        </Expert>

        <p className="kicker">
          one province <i />
        </p>

        <p className="txt">
          Somebody lives at the bottom of that spread, and it is the same somebody every year.{" "}
          {sub.province} holds the fewest people above the line in{" "}
          <Anno src="[subject]" pane="evidence-people">
            every one of the {k.persons.by_year.length} clean years
          </Anno>{" "}
          — {sub.worst.persons.toFixed(2)} people at its worst, in {sub.worst.year}, and{" "}
          {sub.latest.persons.toFixed(2)} in {sub.latest.year}. Its minimum wage that year was{" "}
          {rupiah(sub.latest.ump)} a month against a poverty line of {rupiah(sub.latest.gk)} a
          person.
        </p>

        <p className="txt">
          A household there of four, with one wage coming in, is below the official poverty line by
          the arithmetic of the law that set the wage. This is not a discovery about {sub.province}.
          It is the oldest question in wage economics, arriving as division. Adam Smith held that a
          wage must at least let a worker raise a family or the supply of workers fails. Marx put
          the same thing as the cost of reproducing the worker <em>and their replacements</em>.
          Rowntree, counting York in 1901, invented the poverty line and immediately discovered that
          family size drove everything.
        </p>

        <p className="txt">
          The twist is that Indonesia agrees. The wage formula introduced in 2021 sets the minimum
          from average consumption per head, multiplied by average household size, divided by the
          average number of household members who work. That is this ratio, written into law. So
          none of the above is a standard imported from outside — it is the state&rsquo;s own
          arithmetic, handed back.
        </p>

        <p className="kicker">
          what the file is called <i />
        </p>

        <p className="txt">
          The dataset is named <em>pekerja sejahtera</em> — the prosperous worker. Nothing in it
          measures prosperity. It measures distance from destitution, which is a different quantity
          and a much smaller one. Aristotle separated <em>zēn</em>, living, from <em>eu zēn</em>,
          living well, and held that only the second was worth organising a city around. A poverty
          line is an instrument for the first. Amartya Sen made the modern version of the objection:
          income sits in the space of commodities and well-being sits in the space of what a person
          is actually able to do, and the rate of exchange between them differs by place — which is
          one way to read a spread of {h.persons_min.toFixed(2)} to {h.persons_max.toFixed(2)} that
          has not closed in {last.year - first.year} years.
        </p>

        <p className="txt">
          So the honest reading of this file is narrow, and worth stating plainly. It cannot tell
          you whether an Indonesian worker is prospering. It can tell you that the number meant to
          answer that question has stopped tracking the thing it is named after, that the legal
          floor is sinking toward the going rate, and that the basket used to define poverty is one
          nobody has ever filled.{" "}
          <Anno src="[integrity]" pane="evidence-2021">
            And it can tell you that one of its own columns is not to be trusted
          </Anno>
          , which is the only claim here the file makes entirely against itself.
        </p>

        <p className="txt dim" style={{ marginTop: "2rem" }}>
          Sources are two BPS series and one Kaggle mirror of them, listed in the intro above.
          Everything on this page was computed by{" "}
          <code>analysis/pipelines/03_pekerja_sejahtera/build.py</code> and committed as{" "}
          <code>data.json</code> before the page was built. Nothing here recomputes.{" "}
          <button type="button" className="d d-go" data-pane="verify">
            verify.py
          </button>{" "}
          re-runs it and refuses to publish drift.
        </p>
      </>
    ),
  },

  /* ── evidence ───────────────────────────────────────────────────────── */

  "evidence-national": {
    title: "evidence · the aggregate among the units",
    node: (
      <>
        <p className="txt dim">
          The file has {g.n_provinces + 1} rows in its province column. One of them is the country.
          It is not flagged, not last, and not named differently from the rest — in{" "}
          <code>ump.csv</code> it is simply another row.
        </p>
        <dl className="kv">
          <div className="hit">
            <dt>rows in the province column</dt>
            <dd>{g.n_provinces + 1}</dd>
          </div>
          <div>
            <dt>actual provinces</dt>
            <dd>{g.n_provinces}</dd>
          </div>
          <div className="hit">
            <dt>the aggregate</dt>
            <dd>{k.source.national_row}</dd>
          </div>
        </dl>
        <p className="tile-cap">
          Every cross-province figure in this piece — spread, Theil, correlation, the minimum and
          the maximum — is computed on {g.n_provinces} rows, not {g.n_provinces + 1}.
        </p>

        <p className="kicker">
          why it matters more than it sounds <i />
        </p>
        <p className="txt">
          A national figure is not an extreme, so it does not announce itself as an outlier. It
          sits near the middle and quietly pulls every measure of spread inward, makes every
          correlation look a little tidier, and adds one fake province to every count. The
          pipeline asserts the row is present and removes it by name; if a future version of the
          file drops it, the build fails rather than silently changing every number.
        </p>
      </>
    ),
  },

  "evidence-2021": {
    title: `evidence · the ${g.excluded_year} column`,
    kind: "wide",
    node: (
      <>
        <p className="txt dim">
          Three tests, none of which needs a source outside the file. Indonesian minimum wages are
          nominally non-decreasing, and in this file no province has a {g.excluded_year - 1} wage
          above its {g.excluded_year + 1} wage — so a {g.excluded_year} value outside that bracket
          is not surprising, it is impossible.
        </p>

        <p className="kicker">
          test one · which year disagrees with its neighbours <i />
        </p>
        <dl className="kv">
          <div>
            <dt>
              ρ(ump {g.excluded_year - 1}, ump {g.excluded_year + 1}) <em>· the two that skip it</em>
            </dt>
            <dd>{sign(g.rho_2020_2022, 4)}</dd>
          </div>
          <div className="hit">
            <dt>
              ρ(ump {g.excluded_year - 1}, ump {g.excluded_year})
            </dt>
            <dd>{sign(g.rho_2020_2021, 4)}</dd>
          </div>
          <div className="hit">
            <dt>
              ρ(ump {g.excluded_year}, ump {g.excluded_year + 1})
            </dt>
            <dd>{sign(g.rho_2021_2022, 4)}</dd>
          </div>
          <div>
            <dt>ρ(ump 2019, ump 2020) · a normal pair, for scale</dt>
            <dd>{sign(g.rho_neighbours_2019_2020, 4)}</dd>
          </div>
        </dl>
        <p className="tile-cap">
          {g.excluded_year - 1} and {g.excluded_year + 1} agree almost perfectly with each other
          while both disagree with {g.excluded_year}. A real year cannot do that: to sit between two
          years that match, it would have to match them too.
        </p>

        <p className="kicker">
          test two and three · which rows, and whose numbers <i />
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>province</th>
                <th>{g.excluded_year - 1}</th>
                <th>{g.excluded_year} in file</th>
                <th>{g.excluded_year + 1}</th>
                <th>the value belongs to</th>
                <th>off by</th>
                <th>row gap</th>
              </tr>
            </thead>
            <tbody>
              {g.violations.map((v) => (
                <tr key={v.province} className={v.belongs_to ? "hit" : undefined}>
                  <td>{v.province}</td>
                  <td>{num(v.y2020)}</td>
                  <td>{num(v.in_file)}</td>
                  <td>{num(v.y2022)}</td>
                  <td>
                    {v.belongs_to ? (
                      <>
                        {v.belongs_to} <em>{v.belongs_to_year}</em>
                      </>
                    ) : (
                      "— matches nothing in the file"
                    )}
                  </td>
                  <td>{v.off_by_rp == null ? "" : v.off_by_rp === 0 ? "exact" : `Rp ${v.off_by_rp}`}</td>
                  <td>{v.row_delta == null ? "" : v.row_delta > 0 ? `+${v.row_delta}` : v.row_delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          {g.n_violations} of {g.n_provinces} provinces break the bracket. {g.n_traced} of them are
          holding another province&rsquo;s wage, to within two rupiah.
        </p>

        <p className="kicker">
          the obvious explanation, and why it is wrong <i />
        </p>
        <p className="txt">
          A single column that slipped one row is the usual cause of this, and it is the first thing
          to test. Shifting the whole {g.excluded_year} column back by one row and re-checking
          against {g.excluded_year - 1} makes the agreement <em>worse</em>, not better:{" "}
          {sign(g.shift_hypothesis.rho_repaired_vs_2020, 4)} against{" "}
          {sign(g.shift_hypothesis.rho_raw_vs_2020, 4)} for the file as it stands. The row gaps in
          the table above are {g.shift_hypothesis.row_deltas.join(", ")} — irregular. This is a
          scramble, not a shift, and the repair is not available from inside the file.
        </p>
        <p className="txt">
          There is a fingerprint. Several displaced values sit exactly one rupiah from their source,
          and {g.rupiah_off_by_one.length} provinces that otherwise froze their wage are off by
          exactly one rupiah too ({g.rupiah_off_by_one.join(", ")}). A one-rupiah error is not a
          typing mistake or a policy decision. It is what a number looks like after a round trip
          through a floating-point value, which suggests this column reached the file down a
          different path than the others.
        </p>

        <p className="kicker">
          what the year actually was <i />
        </p>
        <dl className="kv">
          <div>
            <dt>provinces with a usable {g.excluded_year} value</dt>
            <dd>{g.clean_rows}</dd>
          </div>
          <div className="hit">
            <dt>of those, froze the wage exactly</dt>
            <dd>{g.frozen_exactly}</dd>
          </div>
        </dl>
        <p className="tile-cap">
          The pandemic freeze. {g.frozen_exactly} provinces did not move the minimum wage by one
          rupiah — visible in the file only once the corrupted rows are set aside.
        </p>

        <p className="kicker">
          what keeping it would have done <i />
        </p>
        <dl className="kv">
          <div>
            <dt>median people per wage, {g.excluded_year} as published</dt>
            <dd>{k.robustness.bad_year_if_kept.median.toFixed(2)}</dd>
          </div>
          <div className="hit">
            <dt>its spread (CV), against ~{last.cv.toFixed(2)} in every clean year</dt>
            <dd>{k.robustness.bad_year_if_kept.cv.toFixed(3)}</dd>
          </div>
          <div>
            <dt>its range</dt>
            <dd>
              {k.robustness.bad_year_if_kept.min.toFixed(2)} –{" "}
              {k.robustness.bad_year_if_kept.max.toFixed(2)}
            </dd>
          </div>
        </dl>
        <p className="tile-cap">
          The median barely moves, which is why this is dangerous: an analysis that reported only
          medians would have published {g.excluded_year} without noticing anything at all.
        </p>
      </>
    ),
  },

  "evidence-people": {
    title: "evidence · the ratio, year by year",
    kind: "wide",
    node: (
      <>
        <p className="txt dim">
          Minimum wage divided by the poverty line for one person, both monthly rupiah, per
          province. {k.source.period.toLowerCase()} figures, town and countryside combined, which is
          the headline BPS series. {g.excluded_year} is absent for the reasons in{" "}
          <button type="button" className="d d-go" data-pane="evidence-2021">
            the column audit
          </button>
          .
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>year</th>
                <th>n</th>
                <th>median</th>
                <th>p10</th>
                <th>min</th>
                <th>max</th>
                <th>CV</th>
                <th>fewest</th>
                <th>most</th>
              </tr>
            </thead>
            <tbody>
              {k.persons.by_year.map((r) => (
                <tr key={r.year} className={r.year === last.year ? "hit" : undefined}>
                  <td>{r.year}</td>
                  <td>{r.n}</td>
                  <td>{r.median.toFixed(2)}</td>
                  <td>{r.p10.toFixed(2)}</td>
                  <td>{r.min.toFixed(2)}</td>
                  <td>{r.max.toFixed(2)}</td>
                  <td>{r.cv.toFixed(3)}</td>
                  <td>{r.lowest}</td>
                  <td>{r.highest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          The median rises to {peak.median.toFixed(2)} in {peak.year} and falls back to{" "}
          {last.median.toFixed(2)} by {last.year}. The <em>fewest</em> column never changes hands.
        </p>

        <p className="kicker">
          how many province-years sit below a given household <i />
        </p>
        <dl className="kv">
          {k.persons.thresholds.map((t) => (
            <div key={t.people} className={t.people === 4 ? "hit" : undefined}>
              <dt>
                under {t.people} people <em>· {t.n} of {num(h.province_years)}</em>
              </dt>
              <dd>{t.pct}%</dd>
            </div>
          ))}
        </dl>
        <p className="tile-cap">
          Read these as counts of people a wage covers, not as a poverty verdict. Households share
          costs, so a wage covering 4 poverty-line individuals goes further than four people living
          alone — the ratio is a floor on the comparison, not the comparison itself.
        </p>

        <p className="kicker">
          {sub.province}, every clean year <i />
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>year</th>
                <th>minimum wage</th>
                <th>poverty line, per person</th>
                <th>people</th>
              </tr>
            </thead>
            <tbody>
              {sub.series.map((c) => (
                <tr key={c.year} className={c.year === sub.worst.year ? "hit" : undefined}>
                  <td>{c.year}</td>
                  <td>{rupiah(c.ump)}</td>
                  <td>{rupiah(c.gk)}</td>
                  <td>{c.persons.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          Lowest of all {g.n_provinces} provinces in every year of the panel. The pipeline asserts
          it, so if that ever stops being true the build fails rather than the sentence going stale.
        </p>

        <p className="kicker">
          the choice this rests on <i />
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>period</th>
                <th>area</th>
                <th>median people</th>
                <th>n</th>
              </tr>
            </thead>
            <tbody>
              {k.robustness.variants.map((v) => (
                <tr
                  key={v.period + v.area}
                  className={v.period === k.source.period && v.area === k.source.area ? "hit" : undefined}
                >
                  <td>{v.period}</td>
                  <td>{v.area}</td>
                  <td>{v.median_persons.toFixed(2)}</td>
                  <td>{v.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          Six defensible versions of the same ratio. The piece quotes the highlighted one; the
          urban line is the harshest and the rural line the kindest, and no choice among them
          changes the shape of anything above.
        </p>
      </>
    ),
  },

  "evidence-tracking": {
    title: "evidence · does the wage follow the cost",
    kind: "wide",
    node: (
      <>
        <p className="txt dim">
          Both variables in logs, so the coefficient reads as an elasticity: the percentage the
          minimum wage moves for each percent the poverty line moves. {two.n} province-years,{" "}
          {two.clusters} provinces, {k.source.years_used.length} years.
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>specification</th>
                <th>β</th>
                <th>se</th>
                <th>se, clustered</th>
                <th>t</th>
                <th>95% CI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>province fixed effects</td>
                <td>{sign(one.beta, 3)}</td>
                <td>{one.se.toFixed(3)}</td>
                <td>{one.se_cluster.toFixed(3)}</td>
                <td>{sign(one.t_cluster, 1)}</td>
                <td>
                  [{sign(one.beta - 1.96 * one.se_cluster, 3)},{" "}
                  {sign(one.beta + 1.96 * one.se_cluster, 3)}]
                </td>
              </tr>
              <tr className="hit">
                <td>province + year fixed effects</td>
                <td>{sign(two.beta, 3)}</td>
                <td>{two.se.toFixed(3)}</td>
                <td>{two.se_cluster.toFixed(3)}</td>
                <td>{sign(two.t_cluster, 1)}</td>
                <td>
                  [{sign(two.ci_cluster[0], 3)}, {sign(two.ci_cluster[1], 3)}]
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          Adding the year effect is the whole result. It removes what happened to the entire country
          at once, and with it the entire apparent relationship.
        </p>

        <p className="kicker">
          the same question asked across provinces instead of within them <i />
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>year</th>
                <th>n</th>
                <th>r</th>
                <th>ρ</th>
                <th>elasticity</th>
                <th>r² </th>
              </tr>
            </thead>
            <tbody>
              {k.elasticity.cross_section.map((c) => (
                <tr key={c.year}>
                  <td>{c.year}</td>
                  <td>{c.n}</td>
                  <td>{sign(c.r, 3)}</td>
                  <td>{sign(c.rho, 3)}</td>
                  <td>{sign(c.elasticity, 3)}</td>
                  <td>{c.r2_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          In any single year, cost of living accounts for a median {h.cross_r2_pct}% of why
          provincial minimum wages differ. The other ~{(100 - h.cross_r2_pct).toFixed(0)}% is
          something else — bargaining, politics, precedent, the previous year&rsquo;s number plus a
          formula.
        </p>
      </>
    ),
  },

  "evidence-spread": {
    title: "evidence · twenty years without convergence",
    kind: "wide",
    node: (
      <>
        <p className="txt dim">
          Theil&rsquo;s T on the {g.n_provinces} provincial minimum wages, year by year. It is an
          entropy measure and scale-free, which is what allows {disp[0].year} and{" "}
          {disp[disp.length - 1].year} to be compared without deflating anything.{" "}
          {g.excluded_year} is omitted.
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>year</th>
                <th>n</th>
                <th>Theil T</th>
                <th>CV</th>
                <th>highest ÷ lowest</th>
              </tr>
            </thead>
            <tbody>
              {disp.map((d) => (
                <tr
                  key={d.year}
                  className={d.year === disp[0].year || d.year === disp[disp.length - 1].year ? "hit" : undefined}
                >
                  <td>{d.year}</td>
                  <td>{d.n}</td>
                  <td>{d.theil.toFixed(5)}</td>
                  <td>{d.cv.toFixed(4)}</td>
                  <td>{d.max_over_min.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          {h.theil_first.toFixed(5)} to {h.theil_last.toFixed(5)} across{" "}
          {disp[disp.length - 1].year - disp[0].year} years. Provincial minimum wages have not
          converged, and have not diverged either.
        </p>

        <p className="kicker">
          and the order of provinces barely changes <i />
        </p>
        <dl className="kv">
          <div className="hit">
            <dt>
              ρ(people per wage in {rp.first_year}, in {rp.last_year})
            </dt>
            <dd>{sign(rp.spearman, 4)}</dd>
          </div>
          <div>
            <dt>r, the same pair</dt>
            <dd>{sign(rp.pearson, 4)}</dd>
          </div>
          <div>
            <dt>provinces compared</dt>
            <dd>{rp.n}</dd>
          </div>
        </dl>

        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>province</th>
                <th>{rp.first_year}</th>
                <th>{rp.last_year}</th>
                <th>change</th>
              </tr>
            </thead>
            <tbody>
              {[...rp.rose_most, ...rp.fell_most].map((m) => (
                <tr key={m.province}>
                  <td>{m.province}</td>
                  <td>{m.first.toFixed(2)}</td>
                  <td>{m.last.toFixed(2)}</td>
                  <td>{sign(m.change, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          The three biggest gains and the three biggest losses over{" "}
          {rp.last_year - rp.first_year} years. Even the movers move by about one person.
        </p>
      </>
    ),
  },

  "evidence-engel": {
    title: "evidence · food share, line against life",
    kind: "wide",
    node: (
      <>
        <p className="txt dim">
          Engel&rsquo;s law: the poorer the household, the greater the share of spending that goes
          on food. The file carries food and non-food twice — once for what people actually spend,
          once inside the poverty line — so the same ratio can be taken of both.
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>year</th>
                <th>area</th>
                <th>food share of the line</th>
                <th>food share of actual spending</th>
                <th>gap</th>
                <th>n</th>
              </tr>
            </thead>
            <tbody>
              {k.engel
                .filter((e) => e.line_food_share != null)
                .map((e) => (
                  <tr
                    key={`${e.year}-${e.area}`}
                    className={e.year === urban.year ? "hit" : undefined}
                  >
                    <td>{e.year}</td>
                    <td>{e.area}</td>
                    <td>{(e.line_food_share! * 100).toFixed(1)}%</td>
                    <td>{(e.spending_food_share * 100).toFixed(1)}%</td>
                    <td>{(e.gap! * 100).toFixed(1)} pt</td>
                    <td>{e.n_spending}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          The gap is stable at roughly {(urban.gap! * 100).toFixed(0)} points for every year both
          series exist. A stable gap is a design, not a discrepancy: BPS builds the food component
          of the line from a fixed calorie basket, so its food share is stipulated rather than
          observed.
        </p>

        <p className="kicker">
          what it is good for <i />
        </p>
        <p className="txt">
          Two things. It gives a welfare ordering that needs no line at all — rural households spend{" "}
          {((rural.spending_food_share - urban.spending_food_share) * 100).toFixed(1)} points more
          of their money on food than urban ones, in {rural.year}, which is Engel&rsquo;s law
          reporting that rural Indonesia is poorer without anybody choosing a threshold. And it puts
          a bound on how literally the poverty line should be read: it is a costing of a normative
          basket, not a description of the poor.
        </p>
      </>
    ),
  },

  "evidence-floor": {
    title: "evidence · the actual wage against the legal one",
    kind: "wide",
    node: (
      <>
        <p className="txt dim">
          The hourly wage employees receive, multiplied by the statutory {k.floor.hours}-hour month,
          divided by that province&rsquo;s legal minimum. A value of 1.00 means the average employee
          earns exactly the floor.
        </p>
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th>year</th>
                <th>n</th>
                <th>median province</th>
                <th>provinces under the minimum</th>
                <th>lowest three</th>
              </tr>
            </thead>
            <tbody>
              {k.floor.series.map((f) => (
                <tr key={f.year} className={f.year === floorLast.year ? "hit" : undefined}>
                  <td>{f.year}</td>
                  <td>{f.n}</td>
                  <td>{f.median.toFixed(3)}×</td>
                  <td>{f.below_minimum}</td>
                  <td>
                    {f.lowest.map((l) => `${l.province} ${l.ratio.toFixed(2)}`).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tile-cap">
          {floorFirst.median.toFixed(2)}× down to {floorLast.median.toFixed(2)}×, and{" "}
          {floorFirst.below_minimum} provinces below the floor rising to {floorLast.below_minimum}.
        </p>

        <p className="kicker">
          the assumption holding this up <i />
        </p>
        <p className="txt">
          {k.robustness.upah_unit_assumed} The direction is robust to being wrong about it: any
          fixed multiplier cancels out of a trend, so the fall from{" "}
          {floorFirst.median.toFixed(2)}× to {floorLast.median.toFixed(2)}× survives even if the
          level is meaningless. The count of provinces below 1.00 does not — that one depends
          entirely on the unit being right.
        </p>
      </>
    ),
  },
};

/** One-line descriptions for the per-route metadata in app/[...trail]. */
export const piece03Blurbs: Record<string, string> = {
  "piece-03":
    "Divide an Indonesian minimum wage by the price of one person's survival and it answers in people. The median province: under five.",
  "evidence-national":
    "The file calls the national aggregate a province. Every cross-province figure is wrong until it is removed.",
  "evidence-2021": `Thirteen of thirty-four provinces carry the wrong minimum wage for ${g.excluded_year}, provable from inside the file.`,
  "evidence-people":
    "Minimum wage over poverty line, province by province, year by year, in people.",
  "evidence-tracking":
    "The wage tracks local cost of living at +1.15 with province fixed effects and at nothing at all once the year is held constant.",
  "evidence-spread":
    "Twenty years of provincial minimum wages with no convergence, and a province ordering that barely moves.",
  "evidence-engel":
    "The poverty line is three-quarters food. Actual spending is under half. The gap has not moved in eight years.",
  "evidence-floor":
    "The average employee wage is falling toward the legal minimum, and in nine provinces it is already below it.",
};

/** The index row for this piece, so the registry stays a registry. */
export const piece03Row = {
  title: k.title,
  tag: "wages & poverty",
  blurb: (
    <>
      Indonesia sets a minimum wage province by province and publishes, separately, the monthly cost
      of keeping one person out of poverty. Dividing the first by the second answers in people: in
      the median province, one legal minimum wage holds {last.median.toFixed(2)} of them above the
      line.
    </>
  ),
  figure: <Spread />,
  axisLeft: "0",
  axisRight: String(k.hist.top),
  axisMid: `people one minimum wage covers, ${num(h.province_years)} province-years · orange = ${sub.province}, ${sub.latest.year}`,
};
