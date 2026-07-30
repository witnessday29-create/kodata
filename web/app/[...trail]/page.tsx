import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stack } from "@/components/Stack";
import { panes, paneTrails, PANE_BLURB } from "@/lib/panes";
import { site } from "@/lib/works";
import { OG } from "@/lib/og";

/**
 * A real page per trail.
 *
 * Every pane used to exist only in the React payload: the fables, the analysis
 * and the whole audit shipped to the browser as JSON inside a <script>, and
 * became DOM only after hydration, once a reader clicked to open the pane. For
 * a portfolio whose value is the writing, that meant a crawler found an empty
 * shell and every shared link previewed identically.
 *
 * So each trail is now pre-rendered as its own HTML file with its own title and
 * description. The stack still does in-page navigation — these routes are entry
 * points, not a replacement for it.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return paneTrails().map((trail) => ({ trail }));
}

type Props = { params: Promise<{ trail: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trail } = await params;
  const leaf = trail[trail.length - 1];
  const pane = panes[leaf];
  if (!pane) return {};

  // the deepest pane names the page; the one it opened from gives it context
  const parent = trail.length > 1 ? panes[trail[0]]?.title : undefined;
  const title = parent
    ? `${pane.title} — ${parent} — ${site.wordmark}`
    : `${pane.title} — ${site.wordmark}`;

  const description =
    PANE_BLURB[leaf] ??
    (parent
      ? `Evidence behind ${parent}, on ${site.wordmark}.`
      : PANE_BLURB.index);

  return {
    title,
    description,
    alternates: { canonical: "/" + trail.join("/") },
    // `images` has to be repeated here. Declaring openGraph at all opts this
    // route out of the inherited one, so without it every deep link — which is
    // 34 of the 35 pages, and the ones actually shared — previews with no card.
    openGraph: { title, description, type: "article", images: [OG] },
    twitter: { card: "summary_large_image", title, description, images: [OG.url] },
  };
}

export default async function Trail({ params }: Props) {
  const { trail } = await params;
  if (trail.some((id) => !panes[id])) notFound();
  return <Stack panes={panes} initial={["index", ...trail]} />;
}
