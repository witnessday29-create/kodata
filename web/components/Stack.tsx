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
 */
export function Stack({ panes, root }: { panes: Record<string, PaneDef>; root: string }) {
  const [trail, setTrail] = useState<string[]>([root]);
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

  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = box.current;
    if (!el) return;
    const pane = el.children[i] as HTMLElement | undefined;
    if (!pane) return;
    const spine = pane.querySelector(".spine") as HTMLElement | null;
    el.scrollTo({
      left: Math.max(0, pane.offsetLeft - (spine?.offsetWidth ?? 44) * i),
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

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

  // The trail is the address, so a checked number can be linked to.
  useEffect(() => {
    const read = () => {
      const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
      const ids = raw.split("/").filter((id) => panes[id]);
      setTrail(ids[0] === root ? ids : [root, ...ids]);
    };
    if (location.hash.length > 2) read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, [panes, root]);

  useEffect(() => {
    const path = trail.length > 1 ? "#/" + trail.slice(1).join("/") : " ";
    history.replaceState(null, "", path === " " ? location.pathname : path);
  }, [trail]);

  // reveal whatever just opened
  useEffect(() => {
    if (!reveal) return;
    const frame = requestAnimationFrame(() => {
      const at = Math.min(reveal.at, trail.length - 1);
      scrollTo(at);
      // A pane that just opened must start at its own beginning — including
      // when it replaced a pane at the same depth, which is why this cannot
      // key off the trail's length.
      const pane = box.current?.children[at] as HTMLElement | undefined;
      const body = pane?.querySelector(".pane-body") as HTMLElement | null;
      if (body) body.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [reveal, trail.length, scrollTo]);

  const close = (i: number) => {
    if (i === 0) return;
    setTrail((cur) => cur.slice(0, i));
    // bring the pane that is now last back into view
    setReveal((r) => ({ n: (r?.n ?? 0) + 1, at: i - 1 }));
  };

  return (
    <div className="stack" ref={box}>
      {trail.map((id, i) => {
        const p = panes[id];
        if (!p) return null;
        return (
          <article
            key={id + i}
            className={"pane" + (p.kind ? " pane-" + p.kind : "")}
            data-i={i}
            style={{ ["--i" as string]: i, zIndex: i + 1 }}
          >
            <button
              type="button"
              className="spine"
              onClick={() => scrollTo(i)}
              title={p.title}
              aria-label={`Back to ${p.title}`}
            >
              <span className="spine-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="spine-t">{p.title}</span>
            </button>

            <div className="pane-card">
              <header className="pane-bar">
                <h2>{p.title}</h2>
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
    </div>
  );
}
