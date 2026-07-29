import type { MetadataRoute } from "next";
import { paneTrails } from "@/lib/panes";
import { site } from "@/lib/works";

/**
 * Every pane is a real page now, so every pane belongs in the sitemap.
 *
 * The point of the routing work was that a crawler should find the writing
 * rather than an empty shell; this is the other half of it. One-segment routes
 * are the pieces and the files, two-segment routes are the evidence behind a
 * figure — the latter rank lower because they exist to be checked, not read
 * cold.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return [
    { url: base + "/", changeFrequency: "monthly", priority: 1 },
    ...paneTrails().map((trail) => ({
      url: base + "/" + trail.join("/"),
      changeFrequency: "yearly" as const,
      priority: trail.length === 1 ? 0.8 : 0.4,
    })),
  ];
}
