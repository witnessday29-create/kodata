import type { Metadata } from "next";
import { Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/works";
import { Bracket } from "@/components/Bracket";

/* Two faces, and the rule the whole site rests on:
     mono  — anything that can be traced to a source file
     serif — anything that was written
   Nothing else. No third face to blur the distinction. */

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--f-mono",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-serif",
  display: "swap",
});

export const metadata: Metadata = {
  // absolute share-preview URLs need this; it comes from site.json so the
  // domain is editable without touching code
  metadataBase: new URL(site.url),
  title: "kodata — open data, followed all the way down to one person",
  description:
    "Every piece starts with a public dataset and ends with a story. The numbers can be checked; the story could not have been invented freely.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${serif.variable}`}>
      <body>
        {/* The bar is shared by every route, so it lives here rather than being
            re-declared per page. Its nav carries `data-pane`, which the stack
            picks up from a document-level listener. */}
        {/* the bar is four tab stops before the reading columns start */}
        <a className="skip" href="#stack">
          Skip to the columns
        </a>
        <header className="bar">
          <a className="mark" href="/">
            <span className="mark-dot">{site.monogram}</span>
            <b>{site.wordmark}</b>
          </a>
          <nav className="nav">
            {site.nav.map((n) =>
              "href" in n ? (
                // leaves the site, so it is a real link rather than a pane trigger
                <a
                  key={n.label}
                  href={n.href}
                  className="nav-out"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bracket>{n.label}</Bracket>
                </a>
              ) : (
                <button key={n.pane} type="button" data-pane={n.pane} aria-label={n.label}>
                  <Bracket>{n.label}</Bracket>
                </button>
              )
            )}
          </nav>
          <a className="mailto" href={`mailto:${site.email}`}>
            <span>{site.email}</span> ↗
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
