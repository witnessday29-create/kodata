import { Stack } from "@/components/Stack";
import { panes, assertGraph } from "@/lib/panes";

// fails the build rather than shipping a dead deep link
assertGraph();

export default function Home() {
  return <Stack panes={panes} initial={["index"]} />;
}
