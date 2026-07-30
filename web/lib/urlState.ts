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

export function writeParams(params: Record<string, string>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
