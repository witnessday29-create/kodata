import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exposureHist, exposureMark } from "@/lib/works";
import { OG } from "@/lib/og";

/**
 * The share card.
 *
 * A portfolio is distributed by being pasted into a chat window, so this is the
 * first thing most people see of the site — and until now it was a grey
 * rectangle with a URL in it.
 *
 * It carries no words, which is deliberate rather than lazy. Every platform
 * renders the title and description as live text beside the image, so words in
 * the picture would only be a second, worse copy of them. And drawing them here
 * would mean a third typeface: satori cannot read the woff2 that next/font
 * fetches, so text would come out in whatever fallback next/og bundles, in
 * breach of the one rule the site does not break. What is left is the site's own
 * motif — 271 occupations as bars, with the one the piece follows in orange —
 * which is both more distinctive than a wordmark and, unlike a wordmark,
 * traceable: every bar is a count of rows in a committed data.json.
 *
 * A hand-written route rather than the `opengraph-image` file convention, for
 * the reasons in lib/og.ts.
 */

/* `output: export` will not guess whether a route handler is static. It is:
   the bars come from a committed data.json and nothing here reads a request. */
export const dynamic = "force-static";

/* The literal favicon, read off disk at build time so the two marks cannot
   drift apart. Base64 rather than percent-encoded: satori decodes the payload
   with the equivalent of atob, which throws on any byte above U+00FF, and
   icon.svg has an em dash in its comment. */
const markUri =
  "data:image/svg+xml;base64," +
  readFileSync(join(process.cwd(), "app", "icon.svg")).toString("base64");

const BAR_W = 13;
const GAP = 4;
const TALL = 300;

export function GET() {
  const peak = Math.max(...exposureHist);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 56,
          background: "#f4f5f7",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            background: "#ffffff",
            border: "1px solid #e5e7ea",
            borderRadius: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markUri} alt="" width={48} height={48} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Each bar sits in a full-height column so the marked one can carry
                a tint band behind it. Without that band the card fails at the
                size it is actually seen: only three occupations fall in the
                subject's bin, so the orange bar alone is four pixels of a
                thumbnail and the one thing the card is about disappears. The
                band locates a column; it does not change a height. */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: GAP, height: TALL }}>
              {exposureHist.map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    width: BAR_W,
                    height: TALL,
                    borderRadius: 2,
                    background: i === exposureMark ? "#fdeee9" : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: BAR_W,
                      height: Math.max(4, Math.round((v / peak) * TALL)),
                      borderRadius: 2,
                      background: i === exposureMark ? "#ef4a1e" : "#cfd3d8",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* the axis, and one tick under the occupation the piece follows */}
            <div style={{ display: "flex", height: 1, background: "#e5e7ea", marginTop: 14 }} />
            <div style={{ display: "flex", gap: GAP, marginTop: 6 }}>
              {exposureHist.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: BAR_W,
                    height: 8,
                    borderRadius: 2,
                    background: i === exposureMark ? "#ef4a1e" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: OG.width, height: OG.height }
  );
}
