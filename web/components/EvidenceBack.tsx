import { paneHref } from "@/lib/paneGraph";

/**
 * The way back, for a reader who did not arrive by clicking.
 *
 * Every evidence pane is also a real, shareable URL — that was the point of
 * pre-rendering one route per trail. But a reader who lands cold on
 * `/evidence-people`, from a link rather than a click, sees a number with no
 * claim attached to it. This names the piece the evidence belongs to and
 * links back to it, so the pane still makes sense as an entry point.
 */
export function EvidenceBack({ parent, title }: { parent: string; title: string }) {
  return (
    <p className="ev-back">
      <a href={paneHref(parent)} data-pane={parent}>
        ↑ evidence for <b>{title}</b>
      </a>
    </p>
  );
}
