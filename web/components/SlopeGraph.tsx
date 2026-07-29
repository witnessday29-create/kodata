"use client";

import { useEffect, useRef } from "react";

type Props = { pairs: number[][]; hero: number; n: number };

/**
 * The finding, in the only shape that makes it legible.
 *
 * Left: each occupation's rank when exposure is predicted from the 21 abilities
 * it is built out of. Right: its rank when exposure is rated per occupation.
 * Same 271 things, two measurements. A scatter at r = −0.367 reads as a vague
 * cloud; the same numbers as 271 connected lines read as a collision.
 */
export function SlopeGraph({ pairs, hero, n }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;

    const pal = { act: "", fit: "", mid: "", faint: "", rule: "" };
    const readPal = () => {
      const cs = getComputedStyle(document.documentElement);
      (Object.keys(pal) as (keyof typeof pal)[]).forEach((k) => {
        pal[k] = cs.getPropertyValue("--" + k).trim();
      });
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t = reduce ? 1 : 0;
    let raf = 0;
    let running = false;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const c = cv.getContext("2d");
      if (!c) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);

      const padX = Math.min(w * 0.16, 104);
      const padY = 42;
      const L = padX;
      const R = w - padX;
      const Y = (rank: number) => padY + ((rank - 1) / (n - 1)) * (h - padY * 2);

      c.strokeStyle = pal.rule;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(L, padY); c.lineTo(L, h - padY);
      c.moveTo(R, padY); c.lineTo(R, h - padY);
      c.stroke();

      c.lineWidth = 1;
      pairs.forEach((p, i) => {
        if (i === hero) return;
        const y0 = Y(p[0]);
        const y1 = Y(p[1]);
        // colour by direction of disagreement, so the braid reads as two flows
        c.strokeStyle = p[1] < p[0] ? pal.act : pal.fit;
        c.globalAlpha = 0.22;
        c.beginPath();
        c.moveTo(L, y0);
        c.lineTo(L + (R - L) * t, y0 + (y1 - y0) * t);
        c.stroke();
      });
      c.globalAlpha = 1;

      const hp = pairs[hero];
      const hy0 = Y(hp[0]);
      const hy1 = Y(hp[1]);
      c.strokeStyle = pal.act;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(L, hy0);
      c.lineTo(L + (R - L) * t, hy0 + (hy1 - hy0) * t);
      c.stroke();

      c.fillStyle = pal.act;
      c.beginPath(); c.arc(L, hy0, 3.5, 0, 6.284); c.fill();
      if (t > 0.98) { c.beginPath(); c.arc(R, hy1, 4.5, 0, 6.284); c.fill(); }

      // the subject's own rank at each end; the name belongs in the caption,
      // where it cannot run off the right edge of the canvas
      c.font = "11px ui-monospace, Consolas, monospace";
      c.textAlign = "right";
      c.fillText(String(hp[0]), L - 9, hy0 + 4);
      if (t > 0.98) {
        c.textAlign = "left";
        c.fillText(String(hp[1]), R + 9, hy1 + 4);
      }

      // column captions sit centred over their own axis, so nothing collides
      c.fillStyle = pal.mid;
      c.textAlign = "center";
      c.fillText("predicted", L, padY - 20);
      c.fillText("rated", R, padY - 20);

      // rank 1 is the most exposed end, n the least — same scale both sides
      c.fillStyle = pal.faint;
      c.textAlign = "right";
      c.fillText("1", L - 9, padY - 4);
      c.fillText(String(n), L - 9, h - padY + 14);
      c.textAlign = "left";
      c.fillText("1", R + 9, padY - 4);
      c.fillText(String(n), R + 9, h - padY + 14);
    };

    const tick = () => {
      t = Math.min(1, t + 0.018);
      draw();
      if (t < 1) raf = requestAnimationFrame(tick);
      else running = false;
    };

    readPal();
    draw();

    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting && !running && t < 1) {
          running = true;
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.25 }
    );
    io.observe(cv);

    const onResize = () => draw();
    const onTheme = () => { readPal(); draw(); };
    window.addEventListener("resize", onResize);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onTheme);
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", onTheme);
      window.removeEventListener("resize", onResize);
    };
  }, [pairs, hero, n]);

  return <canvas className="slope" ref={ref} />;
}
