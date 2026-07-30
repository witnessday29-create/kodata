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
  // the click handler is bound once (see the effect below) and would
  // otherwise close over the trail from that first render
  const trailRef = useRef(trail);
  useEffect(() => {
    trailRef.current = trail;
  }, [trail]);

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
  // resetScroll is false when the reveal is a close/back — returning to a pane
  // the reader already had scrolled into, which should stay where they left it
  const [reveal, setReveal] = useState<{ n: number; at: number; resetScroll: boolean } | null>(
    null
  );

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

      // Already open somewhere in the trail — including further left, which is
      // what a link back to an ancestor (EvidenceBack, or re-clicking a pane
      // that opened this one) looks like — go there instead of appending a
      // second copy of it.
      const existing = trailRef.current.indexOf(id);
      const at = existing !== -1 ? existing : i + 1;
      setTrail((cur) => {
        const j = cur.indexOf(id);
        if (j !== -1) return cur.slice(0, j + 1);
        return cur[i + 1] === id ? cur : [...cur.slice(0, i + 1), id];
      });
      // going back to a pane already in the trail: leave its scroll alone
      setReveal((r) => ({ n: (r?.n ?? 0) + 1, at, resetScroll: existing === -1 }));
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [panes]);

  /**
   * The URL for a trail: the leaf names the page, the rest rides in `?via=`.
   *
   * One pre-rendered file per *path* worked while a trail was at most two
   * panes deep, which is all `paneTrails()` generates. But the stack goes as
   * deep as the reader clicks, so /a/b/c was a URL the site could produce and
   * not serve — a deep trail 404'd the moment it was reloaded or shared. One
   * route per pane covers any depth instead, because the path is now always a
   * single pane id.
   *
   * Other query keys are left alone: the interactive pieces keep their own
   * state there, and a shared link has to carry both.
   */
  const trailUrl = useCallback((ids: string[]) => {
    const rest = ids.slice(1);
    const params = new URLSearchParams(location.search);
    if (rest.length > 1) params.set("via", rest.slice(0, -1).join(","));
    else params.delete("via");
    const q = params.toString();
    return (rest.length ? "/" + rest[rest.length - 1] : "/") + (q ? "?" + q : "");
  }, []);

  /** The trail a URL describes, in either shape: /a/b, or /b?via=a. */
  const trailFromLocation = useCallback(() => {
    const segs = decodeURIComponent(location.pathname).split("/").filter(Boolean);
    const via = new URLSearchParams(location.search).get("via");
    const ids = [...(via ? via.split(",") : []), ...segs].filter(
      (id) => panes[id] && id !== root
    );
    return [root, ...ids.filter((id, i) => ids.indexOf(id) === i)];
  }, [panes, root]);

  useEffect(() => {
    const read = () => setTrail(trailFromLocation());
    // A static export serves the same HTML whatever the query string is, so
    // `?via=` can only be applied once the client is running. The leaf — the
    // pane actually being read — is server-rendered either way.
    read();
    // back and forward have to work: the reader's trail is in the history
    addEventListener("popstate", read);
    return () => removeEventListener("popstate", read);
  }, [trailFromLocation]);

  // First write normalises whatever shape the reader arrived on (a legacy
  // two-segment link, or a deep one) without adding a history entry they did
  // not create; after that, opening a pane is a step to walk back out of.
  const urlSynced = useRef(false);
  useEffect(() => {
    const next = trailUrl(trail);
    if (location.pathname + location.search === next) {
      urlSynced.current = true;
      return;
    }
    if (!urlSynced.current) {
      urlSynced.current = true;
      history.replaceState(null, "", next);
      return;
    }
    history.pushState(null, "", next);
  }, [trail, trailUrl]);

  // reveal whatever just opened
  useEffect(() => {
    if (!reveal) return;
    let second = 0;
    const frame = requestAnimationFrame(() => {
      const at = Math.min(reveal.at, trail.length - 1);
      scrollTo(at);
      const pane = paneAt(at);
      // A pane that just opened must start at its own beginning — including
      // when it replaced a pane at the same depth, which is why this cannot
      // key off the trail's length. But a close/back reveals a pane the
      // reader was already scrolled into, and resetting that to the top on
      // every close read as the pane starting over each time.
      if (reveal.resetScroll) {
        const body = pane?.querySelector(".pane-body") as HTMLElement | null;
        if (body) body.scrollTop = 0;
      }

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
    // bring the pane that is now last back into view, exactly as the reader
    // left it
    setReveal((r) => ({ n: (r?.n ?? 0) + 1, at: i - 1, resetScroll: false }));
  };

  // Escape closes the last pane like it would a dialog; Home returns to the
  // index. Both skip while a form control has focus, so they never fight a
  // search input's own use of those keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
      if (e.key === "Escape" && !inField) {
        setTrail((cur) => {
          if (cur.length <= 1) return cur;
          setReveal((r) => ({ n: (r?.n ?? 0) + 1, at: cur.length - 2, resetScroll: false }));
          return cur.slice(0, -1);
        });
      } else if (e.key === "Home" && !inField) {
        setTrail((cur) => {
          if (cur.length <= 1) return cur;
          setReveal((r) => ({ n: (r?.n ?? 0) + 1, at: 0, resetScroll: false }));
          return [cur[0]];
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
