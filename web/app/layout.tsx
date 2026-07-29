import type { Metadata } from "next";
import { Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

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
  title: "kodata — open data, followed all the way down to one person",
  description:
    "Every piece starts with a public dataset and ends with a story. The numbers can be checked; the story could not have been invented freely.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
