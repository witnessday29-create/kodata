import exposure from "@/content/01-ai-exposure/data.json";
import screen from "@/content/02-screen-time/data.json";
import siteConfig from "@/content/site.json";

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

export const order = ["01-ai-exposure", "02-screen-time"];

/** Number formatting, used everywhere a figure is shown. */
export const num = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const sign = (n: number, digits = 3) =>
  (n < 0 ? "−" : "+") + num(Math.abs(n), digits);
