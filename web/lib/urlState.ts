/**
 * Query-string state for a reader-built result — not the trail.
 *
 * Stack.tsx owns the pathname (it is the trail, and pushState-ing it is what
 * makes a checked figure linkable). This only ever touches the query string,
 * with replaceState, so a slider dragged fifty times does not spam history
 * and never fights the trail's own navigation.
 */

export function readParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * An index into one of the precomputed axes, or null if the URL does not
 * carry a usable one.
 *
 * Null-checking this is not optional and is why it is a function rather than
 * `Number(readParam(...))` at each call site: `Number(null)` is `0`, and `0`
 * is a valid index on every axis here — so reading an absent parameter that
 * way does not fall through to the default, it silently *selects the first
 * position*. Piece 03 shipped that way and opened on a household of one
 * person, the single most flattering cell in the grid, when the default it
 * was built around is four.
 */
export function readIndex(name: string, length: number): number | null {
  const raw = readParam(name);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < length ? n : null;
}

/**
 * A number the URL actually carries, or null.
 *
 * The same trap as `readIndex`, one step earlier: the pieces that look a
 * parameter up by *value* rather than position do `axis.indexOf(Number(...))`,
 * which is only safe while no axis happens to contain a zero. Piece 02's
 * cutoffs start at 5 and its thresholds at 2, so it survives on a coincidence
 * the pipeline is free to withdraw. This does not depend on one.
 */
export function readNumber(name: string): number | null {
  const raw = readParam(name);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeParams(params: Record<string, string>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
