import exposure from "@/content/01-ai-exposure/data.json";
import screen from "@/content/02-screen-time/data.json";
import wage from "@/content/03-pekerja-sejahtera/data.json";
import siteConfig from "@/content/site.json";
import auditSummary from "@/content/audit.json";

/** Emitted by analysis/notebooks/make_audit.py, so the page never restates a
 *  pass count by hand. */
export const audit = auditSummary;

/** Written copy, kept out of the code so it can be edited without touching TSX.
 *  The data.json files beside it are computed; this one is hand-written. */
export const site = siteConfig;

/** The shape the Python pipeline promises. One file per work. */
export type Work = typeof exposure;

export const works: Record<string, Work> = {
  "01-ai-exposure": exposure,
};

/** Piece 02 has its own shape, so it is imported on its own rather than
 *  squeezed into the piece-01 type. */
export const screenTime = screen;
export type ScreenTime = typeof screen;

/** Piece 03, likewise. Three pieces in, the lesson is that one dataset's shape
 *  is never another's, and forcing a shared type would only mean a union of
 *  optional fields that the prose then has to guard. */
export const wages = wage;
export type Wages = typeof wage;

export const order = ["01-ai-exposure", "02-screen-time", "03-pekerja-sejahtera"];

/** Number formatting, used everywhere a figure is shown. */
export const num = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const sign = (n: number, digits = 3) =>
  (n < 0 ? "−" : "+") + num(Math.abs(n), digits);

/* ── the signature ──────────────────────────────────────────────────────
   Piece 01's histogram, binned here rather than in the pipeline because the
   bin count is a property of how wide the figure is drawn, not of the data.
   The values being counted are still the pipeline's, and no number below is
   computed — only sorted into buckets.

   It lives in this module because two very different surfaces need the same
   bars: the index row, and the share card in app/opengraph-image.tsx. */

export const SIG_BINS = 56;
export const SIG_MAX = 0.9;

export function histogram(values: number[], bins = SIG_BINS, max = SIG_MAX) {
  const h = new Array(bins).fill(0);
  for (const v of values) h[Math.min(bins - 1, Math.floor((v / max) * bins))]++;
  return h;
}

/** Every occupation's exposure score, as bar heights. */
export const exposureHist = histogram(exposure.opening.cloud.map((c) => c[0]));

/** Which of those bars is the subject — the one drawn in orange. */
export const exposureMark = Math.min(
  SIG_BINS - 1,
  Math.floor((exposure.subject.exposure / SIG_MAX) * SIG_BINS)
);
