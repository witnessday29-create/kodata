"use client";

import { useState } from "react";

/**
 * Copy the exact page a reader just built.
 *
 * The sliders write their state into the URL (see lib/urlState.ts) as fast as
 * they move, via replaceState — so by the time anyone presses this, the
 * address bar already matches what is on screen. This just makes that fact
 * discoverable instead of requiring a reader to notice and copy it by hand.
 */
export function ShareLink({
  label = "copy this link",
  className = "share",
}: {
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard permission denied or unavailable — nothing else to do
    }
  };

  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? "copied" : label}
    </button>
  );
}
