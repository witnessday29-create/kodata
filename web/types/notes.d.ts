/**
 * Frontmatter, as a typed named export.
 *
 * `remark-mdx-frontmatter` turns a note's YAML header into `export const meta`.
 * This merges onto the `*.mdx` declaration that `@types/mdx` already provides
 * for the default export, so a note is typed for both what it renders and what
 * it claims about itself.
 *
 * `tier` is the maturity of the note, and it is not decoration: it decides
 * what the note is allowed to contain. A `seedling` may carry no <Anno> at
 * all — nothing traceable, so nothing that needs checking, and the absence of
 * any mono on screen is what tells a reader it is unfinished. An `evergreen`
 * must have evidence behind every figure it sets.
 */
declare module "*.mdx" {
  export const meta: {
    title: string;
    tier: "seedling" | "growing" | "evergreen";
    updated?: string;
  };
}
