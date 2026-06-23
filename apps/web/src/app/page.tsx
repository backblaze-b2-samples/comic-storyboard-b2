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
import { ErrorState } from "@/components/ui/error-state";
import { GeneratingLoader } from "@/components/ui/generating-loader";
import { BookOpen } from "lucide-react";

const MOCK_PANELS = [
  {
    label: "Hero reference",
    caption: "Character sheet — lighthouse keeper, weathered coat, lantern in hand",
    gradient: "linear-gradient(135deg, #1a2744 0%, #0f3460 50%, #16213e 100%)",
    accent: "#4493f8",
    tag: "reference",
  },
  {
    label: "Panel 1",
    caption: "The keeper climbs the spiral stairs at dusk, wind howling outside",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
    accent: "#7c3aed",
    tag: "panel",
  },
  {
    label: "Panel 2",
    caption: "A storm-petrel crashes against the lantern glass — their eyes meet",
    gradient: "linear-gradient(135deg, #0d2137 0%, #1a3a5c 50%, #0a1628 100%)",
    accent: "#06b6d4",
    tag: "panel",
  },
  {
    label: "Panel 3",
    caption: "The keeper cradles the injured bird gently beside the warm light",
    gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)",
    accent: "#f59e0b",
    tag: "panel",
  },
  {
    label: "Panel 4",
    caption: "Morning — the petrel perches on the railing, ready to fly free",
    gradient: "linear-gradient(135deg, #0c2340 0%, #1e3a5f 40%, #e8b86d22 100%)",
    accent: "#f0a500",
    tag: "panel",
  },
];

function MockStoryboard() {
  return (
    <div className="space-y-4 opacity-80">
      {/* Run header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground font-mono">
            run a3f9e12b
          </span>
          <span className="text-xs text-muted-foreground">
            A lonely lighthouse keeper befriends a storm-petrel
          </span>
        </div>
        <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground cursor-not-allowed select-none">
          Export strip
        </span>
      </div>

      {/* Panel grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_PANELS.map((panel, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden border border-border"
            style={{ background: "#151b23" }}
          >
            {/* Image area */}
            <div
              style={{
                height: 180,
                background: panel.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {/* Simulated comic lines */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 28px, ${panel.accent}18 28px, ${panel.accent}18 29px)`,
              }} />
              <div style={{
                position: "relative",
                width: 48, height: 48, borderRadius: "50%",
                background: panel.accent + "33",
                border: `2px solid ${panel.accent}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <BookOpen size={20} color={panel.accent} />
              </div>
            </div>

            {/* Card footer */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: panel.accent }}>{panel.label}</span>
                {i > 0 && (
                  <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 cursor-not-allowed">
                    Regenerate
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{panel.caption}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Provenance: every asset above carries a SHA-256 manifest from Genblaze.
        Manifest hash <code className="font-mono">a3f9e12b4c7d8e2f…</code>
      </p>
    </div>
  );
}

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
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">Generate a Storyboard</h1>
        <p className="text-sm text-muted-foreground">
          A sentence in, a character-consistent comic out — generated with
          Genblaze and persisted to Backblaze B2.
        </p>
      </div>

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

      {!pending && !error && !result && <MockStoryboard />}
    </div>
  );
}
