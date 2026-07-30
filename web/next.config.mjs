import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

/**
 * MDX is here so a note can be a file rather than a node in a 2,400-line
 * registry. It changes nothing about where numbers come from: MDX only
 * renders, and Python is still the only thing that computes.
 *
 * Frontmatter comes out as a named `meta` export, which is what lets a note
 * declare its own title and maturity instead of having them declared for it
 * somewhere else.
 */
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "meta" }]],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing is computed at request time: every number on the site comes from a
  // data.json committed by the Python pipeline. Static export keeps that honest.
  output: "export",
  images: { unoptimized: true },
  // the dev badge sits exactly where the audit switch lives
  devIndicators: false,
  // notes live in content/, not app/, so no .mdx file becomes a route by
  // accident — this only tells Next the extension is a real one
  pageExtensions: ["ts", "tsx", "mdx"],
};

export default withMDX(nextConfig);
