import type { ReactNode } from "react";

/**
 * The pieces a note is built from.
 *
 * A note is a file now, so it should not have to know CSS class names to look
 * like the rest of the site. These are the handful of shapes the design
 * already has, given names an author can use.
 */

/** A small caps label with a rule running off to the right. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="kicker">
      {children} <i />
    </p>
  );
}

/** A numbered list of things that are read, not clicked. */
export function Layers({ children }: { children: ReactNode }) {
  return <div className="rows">{children}</div>;
}

export function Layer({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="row">
      <span className="row-k">{String(n).padStart(2, "0")}</span>
      <span>
        <span className="row-t">{title}</span>
        <span className="row-s">{children}</span>
      </span>
      <span className="row-go" />
    </div>
  );
}
