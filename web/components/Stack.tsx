"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PaneDef = { title: string; kind?: string; node: React.ReactNode };

/**
 * The stack.
 *
 * Panes open to the right and never replace each other, so the trail of what
 * you followed to get here stays on screen. Each pane sticks at its own left
 * offset as you scroll, leaving a vertical spine behind — the collapsed panes
 * are the breadcrumb, and clicking one brings it back.
 *
 * Anything inside a pane can open the next one by carrying `data-pane="<id>"`;
 * the container listens once and works that out from where the click landed.
 * That is what lets a figure inside a sentence open its own evidence without
 * the prose knowing anything about the stack.
 *
 * `initial` comes from the route, which is pre-rendered as real HTML — so the
 * writing is in the document before any JavaScript runs. Moving around after
 * that is done here, with pushState, because a full navigation would throw away
 * the trail the reader is standing in.
 */
export function Stack({
  panes,
  initial,
}: {
  panes: Record<string, PaneDef>;
  initial: string[];
}) {
  const [trail, setTrail] = useState<string[]>(initial);
  const root = initial[0];
  const box = useRef<HTMLDivElement>(null);

  /**
   * Which pane to reveal, and a counter to force it.
   *
   * This used to key off `trail.length`, which broke the commonest move on the
   * site: opening piece 02 while piece 01 is open replaces a pane at the same
   * depth, so the length never changed, so nothing scrolled and the new pane
   * inherited the old one's scroll position. It read as a dead link. The
   * counter changes on every open — even a re-open of what is already there,
   * which should still take you to it.
   */
  const [reveal, setReveal] = useState<{ n: number; at: number } | null>(null);

  /** The container also holds the heading, so `children[i]` is off by one. */
  const paneAt = useCallback(
    (i: number) => box.current?.querySelectorAll<HTMLElement>(".pane")[i],
    []
  );

  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = box.current;
    if (!el) return;
    const pane = paneAt(i);
    if (!pane) return;
    const spine = pane.querySelector(".spine") as HTMLElement | null;
    el.scrollTo({
      left: Math.max(0, pane.offsetLeft - (spine?.offsetWidth ?? 44) * i),
      behavior: smooth ? "smooth" : "auto",
    });
  }, [paneAt]);

  // Delegated on the document, not the container: the top bar lives outside the
  // stack but still opens panes, and a trigger with no pane around it opens
  // from the root.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const trigger = t.closest("[data-pane]") as HTMLElement | null;
      if (!trigger) return;
      const id = trigger.dataset.pane;
      if (!id || !panes[id]) return;
      e.preventDefault();

      const from = trigger.closest(".pane") as HTMLElement | null;
      const i = from ? Number(from.dataset.i ?? 0) : 0;

      // already open at this depth: leave the trail alone, but still go there
      setTrail((cur) => (cur[i + 1] === id ? cur : [...cur.slice(0, i + 1), id]));
      setReveal((r) => ({ n: (r?.n ?? 0) + 1, at: i + 1 }));
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [panes]);

  // The path is the trail, so a checked number can be linked to — and every one
  // of these paths is a pre-rendered HTML file, not a fragment.
  const asPath = useCallback(
    (ids: string[]) => "/" + ids.slice(1).join("/"),
    []
  );

  useEffect(() => {
    const read = () => {
      const ids = decodeURIComponent(location.pathname)
        .split("/")
        .filter(Boolean)
        .filter((id) => panes[id]);
      setTrail([root, ...ids.filter((id) => id !== root)]);
    };
    // back and forward have to work: the reader's trail is in the history
    addEventListener("popstate", read);
    return () => removeEventListener("popstate", read);
  }, [panes, root, asPath]);

  useEffect(() => {
    const next = asPath(trail);
    if (location.pathname.replace(/\/$/, "") === next.replace(/\/$/, "")) return;
    // pushState, not replaceState: opening evidence is a step the reader should
    // be able to walk back out of
    history.pushState(null, "", next);
  }, [trail, asPath]);

  // reveal whatever just opened
  useEffect(() => {
    if (!reveal) return;
    let second = 0;
    const frame = requestAnimationFrame(() => {
      const at = Math.min(reveal.at, trail.length - 1);
      scrollTo(at);
      // A pane that just opened must start at its own beginning — including
      // when it replaced a pane at the same depth, which is why this cannot
      // key off the trail's length.
      const pane = paneAt(at);
      const body = pane?.querySelector(".pane-body") as HTMLElement | null;
      if (body) body.scrollTop = 0;

      // Focus used to stay on the figure that was clicked, so a pane appeared
      // off to the right and nothing announced it. Moving focus to the new
      // pane's heading is what tells a screen reader where it now is.
      //
      // It has to wait a frame: called in the same tick as a smooth scrollTo on
      // the container, the focus does not take.
      second = requestAnimationFrame(() => {
        (pane?.querySelector(".pane-bar h2") as HTMLElement | null)?.focus({
          preventScroll: true,
        });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(second);
    };
  }, [reveal, trail.length, scrollTo, paneAt]);

  const close = (i: number) => {
    if (i === 0) return;
    setTrail((cur) => cur.slice(0, i));
    // bring the pane that is now last back into view
    setReveal((r) => ({ n: (r?.n ?? 0) + 1, at: i - 1 }));
  };

  const leaf = panes[trail[trail.length - 1]];

  return (
    <main className="stack" id="stack" ref={box} aria-label="Reading columns">
      {/* The page had no h1 at all: pane titles are h2 and there was nothing
          above them. This names the current trail for anyone navigating by
          heading, and follows it as the trail changes. */}
      <h1 className="sr">
        {leaf ? leaf.title : "index"} — kodata
      </h1>

      {/* A pane opening is a visual event off to the right, which announces
          itself to nobody. Focus is moved to the new pane's heading as well,
          but this does not depend on focus landing — so it is the part that can
          be relied on. */}
      <p className="sr" aria-live="polite" aria-atomic="true">
        {trail.length > 1
          ? `Column ${trail.length}: ${leaf?.title ?? ""}`
          : "Index column"}
      </p>

      {trail.map((id, i) => {
        const p = panes[id];
        if (!p) return null;
        const last = i === trail.length - 1;
        return (
          <article
            key={id + i}
            className={"pane" + (p.kind ? " pane-" + p.kind : "")}
            data-i={i}
            style={{ ["--i" as string]: i, zIndex: i + 1 }}
            aria-labelledby={`pane-h-${i}`}
          >
            <button
              type="button"
              className="spine"
              onClick={() => scrollTo(i)}
              title={p.title}
              aria-label={`Back to ${p.title}`}
              aria-current={last ? "true" : undefined}
            >
              <span className="spine-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="spine-t">{p.title}</span>
            </button>

            <div className="pane-card">
              <header className="pane-bar">
                {/* tabindex -1 so focus can be moved here when the pane opens,
                    without adding a stop to the normal tab order */}
                <h2 id={`pane-h-${i}`} tabIndex={-1}>
                  {p.title}
                </h2>
                {i > 0 && (
                  <button
                    type="button"
                    className="pane-x"
                    onClick={() => close(i)}
                    aria-label={`Close ${p.title}`}
                  >
                    close
                  </button>
                )}
              </header>
              <div className="pane-body">{p.node}</div>
            </div>
          </article>
        );
      })}
    </main>
  );
}
