/**
 * The pane graph, as data with no JSX and no component imports.
 *
 * Pulled out of panes.tsx so a link's href can be computed from the same
 * source of truth `paneTrails()` and `assertGraph()` read, without Anno.tsx
 * having to import panes.tsx (which imports Anno.tsx) and create a cycle.
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
  ],
  "piece-03": [
    "evidence-national",
    "evidence-2021",
    "evidence-people",
    "evidence-tracking",
    "evidence-spread",
    "evidence-engel",
    "evidence-floor",
  ],
  notebook: ["verify"],
};

const PARENT_OF: Record<string, string> = Object.fromEntries(
  Object.entries(PANE_LINKS).flatMap(([parent, children]) => children.map((c) => [c, parent]))
);

/**
 * The pre-rendered route for a pane, wherever the link to it sits.
 *
 * A child pane has exactly one real two-segment route — the one under its
 * parent in PANE_LINKS — regardless of how deep in the stack the reader was
 * when they clicked. A pane with no parent is a root pane with its own
 * one-segment route.
 */
export function paneHref(id: string): string {
  const parent = PARENT_OF[id];
  return parent ? `/${parent}/${id}` : `/${id}`;
}
