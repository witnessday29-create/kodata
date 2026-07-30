import { works, screenTime, wages, site } from "@/lib/works";
import { PANE_BLURB } from "@/lib/panes";

/**
 * The feed, as data.
 *
 * Kept out of the route for the same reason paneGraph is kept out of panes:
 * so what goes in it can be asserted at build time rather than discovered by
 * a reader whose reader is empty.
 *
 * Only the pieces. The evidence panes are not posts — they exist to be opened
 * from a sentence and checked, and a subscriber who got eighteen of them for
 * every piece would unsubscribe, correctly. Same for the notebook, the
 * verifier and the checks list: they are apparatus, not writing.
 *
 * Titles come from the pipelines' data.json, and descriptions from the same
 * PANE_BLURB the per-route metadata uses, so a piece is described identically
 * wherever it is described. The only thing stated by hand is the date, which
 * is in site.json because nothing computes it.
 */

/**
 * The feed's public identity, in one place.
 *
 * Two files have to agree about it — the root layout and the per-trail route —
 * and they will disagree in the documented way if left to inherit it. Naming
 * `alternates` in a route replaces the inherited object wholesale, so the
 * canonical URL that every deep link sets was already dropping the feed link
 * from 34 of the 35 pages. That is the same failure og:image had, for the same
 * reason, which is why it is written down once here rather than twice there.
 */
export const FEED = {
  url: "/feed.xml",
  type: "application/rss+xml",
} as const;

type Item = { pane: string; title: string; description: string; published: string };

/** The pieces, oldest first — the order they were written in. */
const PIECES = [
  { pane: "piece-01", title: works["01-ai-exposure"].title },
  { pane: "piece-02", title: screenTime.title },
  { pane: "piece-03", title: wages.title },
];

const PUBLISHED = site.feed.published as Record<string, string>;

/**
 * Every piece, newest first, or a build failure.
 *
 * `assertGraph()` set the precedent: a link that goes nowhere fails the build
 * rather than shipping. A piece with no date is the same class of mistake —
 * it would simply be missing from the feed, which is the kind of absence
 * nobody notices for months.
 */
export function feedItems(): Item[] {
  const items = PIECES.map(({ pane, title }) => {
    const published = PUBLISHED[pane];
    if (!published) {
      throw new Error(
        `feed: no published date for ${pane}. Add it to feed.published in content/site.json.`
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) {
      throw new Error(`feed: published date for ${pane} is not YYYY-MM-DD: ${published}`);
    }
    const description = PANE_BLURB[pane];
    if (!description) throw new Error(`feed: no PANE_BLURB for ${pane}`);
    return { pane, title, description, published };
  });

  // newest first, which is what a reader shows at the top; ties keep the order
  // they were written in, so piece 02 sits above piece 01 on a shared day
  return items.reverse().sort((a, b) => b.published.localeCompare(a.published));
}

/** RFC-822, which is what RSS dates are. A bare date is midnight UTC. */
export function rfc822(day: string): string {
  return new Date(day + "T00:00:00Z").toUTCString();
}

/** XML has five of these and getting one wrong breaks the whole document. */
export function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
