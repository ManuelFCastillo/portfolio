import { ResumeDocument } from "@/components/ResumeDocument";
import { Shell } from "@/components/Shell";
import { RunnerProvider } from "@/lib/runner-context";
import { WindowProvider } from "@/lib/windows";

export default function Home() {
  return (
    <>
      {/* Server-rendered, semantic, crawlable. Screen readers and printers
          get this; everyone else gets the runner. */}
      <ResumeDocument />

      <RunnerProvider>
        <WindowProvider>
          <Shell />
        </WindowProvider>
      </RunnerProvider>
    </>
  );
}
