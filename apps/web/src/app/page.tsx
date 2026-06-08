"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  createStoryboard,
  regeneratePanel,
  exportStrip,
  type StoryboardResponse,
} from "@/lib/api";
import { StoryForm } from "@/components/story-form";
import { StoryboardGrid } from "@/components/storyboard-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { GeneratingLoader } from "@/components/ui/generating-loader";
import { BookOpen } from "lucide-react";

export default function Home() {
  const [result, setResult] = useState<StoryboardResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [regenStep, setRegenStep] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function generate(idea: string, panelCount: number) {
    setPending(true);
    setError(null);
    try {
      setResult(await createStoryboard(idea, panelCount));
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }

  async function regenerate(panelPrompt: string) {
    if (!result) return;
    setRegenStep(1);
    try {
      setResult(await regeneratePanel(result.run.run_id, panelPrompt));
      toast.success("Panel variant created (lineage preserved).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Variant failed.");
    } finally {
      setRegenStep(null);
    }
  }

  async function exportPng() {
    if (!result) return;
    setExporting(true);
    try {
      const urls = result.run.steps
        .slice(1)
        .map((s) => s.assets[0]?.url)
        .filter(Boolean) as string[];
      const blob = await exportStrip(urls);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "storyboard.png";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Comic Storyboard</h1>
        <p className="text-sm text-muted-foreground">
          A sentence in, a character-consistent comic out — generated with
          Genblaze and persisted to Backblaze B2.
        </p>
      </header>

      <StoryForm onSubmit={generate} pending={pending} />

      {pending && (
        <div className="flex justify-center py-12">
          <GeneratingLoader size="lg" label="Scripting and drawing panels…" />
        </div>
      )}

      {!pending && !!error && (
        <ErrorState error={error} onRetry={() => setError(null)} />
      )}

      {!pending && !error && result && (
        <StoryboardGrid
          run={result.run}
          manifestHash={result.manifest.canonical_hash}
          onRegenerate={regenerate}
          regeneratingStep={regenStep}
          onExport={exportPng}
          exporting={exporting}
        />
      )}

      {!pending && !error && !result && (
        <EmptyState
          icon={BookOpen}
          title="No storyboard yet"
          description="Describe a story above to generate your first set of panels."
        />
      )}
    </main>
  );
}
