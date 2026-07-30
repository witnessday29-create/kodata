import { site } from "@/lib/works";
import { feedItems, rfc822, xml } from "@/lib/feed";

/**
 * The feed.
 *
 * A hand-written route rather than a library, for the same reason the share
 * card is one: this emits about thirty lines of XML from three committed
 * data.json files, and a dependency to do that would be larger than the thing
 * it does.
 *
 * `/feed.xml` rather than an extensionless route, and for exactly the reason
 * in lib/og.ts: a static host guesses Content-Type from the extension. A
 * reader handed application/octet-stream will not parse it.
 */

/* `output: export` will not guess whether a route handler is static. It is:
   every item comes from a committed file and nothing here reads a request. */
export const dynamic = "force-static";

export function GET() {
  const base = site.url.replace(/\/$/, "");
  const items = feedItems();
  // the newest post, not the moment of the build — otherwise every rebuild
  // republishes an unchanged feed and readers show it as new
  const updated = rfc822(items[0].published);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.wordmark)}</title>
    <link>${base}/</link>
    <description>${xml(site.index.blurb)}</description>
    <language>en</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    (i) => `    <item>
      <title>${xml(i.title)}</title>
      <link>${base}/${i.pane}</link>
      <guid isPermaLink="true">${base}/${i.pane}</guid>
      <pubDate>${rfc822(i.published)}</pubDate>
      <description>${xml(i.description)}</description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
