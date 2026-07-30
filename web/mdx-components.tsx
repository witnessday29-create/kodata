import type { MDXComponents } from "mdx/types";
import { Anno } from "@/components/Anno";
import { Expert, CI, Check, RatioCI } from "@/components/Expert";
import { Kicker, Layers, Layer } from "@/components/Note";

/**
 * What a note is allowed to be made of, and how it is set.
 *
 * The App Router picks this up for every MDX file. Two jobs:
 *
 * 1. The typographic rule stops depending on the author remembering it. A
 *    paragraph written in a note gets `.txt` — serif, because it was written —
 *    without anybody typing a class name. Mono only ever arrives through
 *    <Anno>, which is the thing that means "traceable to a source file".
 *
 * 2. Heading levels are shifted down one. The pane's own title is the h2 on
 *    screen, so a note's top-level `#` has to be an h3 or the document grows a
 *    second h2 and the outline stops making sense.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    p: (props) => <p className="txt" {...props} />,
    h1: (props) => <h3 className="h" {...props} />,
    h2: (props) => <h4 className="intro-h" {...props} />,
    h3: (props) => <h5 className="intro-h" {...props} />,
    blockquote: (props) => <blockquote className="txt dim" {...props} />,

    // available to every note, so a figure can open its own evidence from
    // inside a sentence exactly as it does in the hand-written panes
    Anno,
    Expert,
    Check,
    CI,
    RatioCI,
    Kicker,
    Layers,
    Layer,

    ...components,
  };
}
