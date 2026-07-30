/**
 * The share card, described in one place.
 *
 * Three files need to agree about it — the route that draws it, the root layout,
 * and the per-trail route — and they disagreed in the obvious way when the card
 * was left to Next's `opengraph-image` file convention: that convention only
 * injects the tag where it is not overridden, so every deep link came out with
 * an og:title and no image at all. Since the sitemap is 34 deep links and one
 * index, that is the common case, not the edge case.
 *
 * It is `/og.png` rather than the convention's extensionless `/opengraph-image`
 * for a duller reason: a static host guesses Content-Type from the extension,
 * and a scraper that is handed application/octet-stream drops the image.
 */
export const OG = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "271 occupations by AI-exposure score, with writers and authors marked",
} as const;
