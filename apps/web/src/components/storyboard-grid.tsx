"use client";

import { Download } from "lucide-react";
import type { Run } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PanelCard } from "@/components/panel-card";

// Renders a completed Run: step 0 is the hero reference sheet, steps 1..N the
// panels. Provenance (manifest hash + run id) is shown as a footer line.
export function StoryboardGrid({
  run,
  manifestHash,
  onRegenerate,
  regeneratingStep,
  onExport,
  exporting,
}: {
  run: Run;
  manifestHash: string;
  onRegenerate: (panelPrompt: string) => void;
  regeneratingStep: number | null;
  onExport: () => void;
  exporting: boolean;
}) {
  const panelUrls = run.steps
    .slice(1)
    .map((s) => s.assets[0]?.url)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">run {run.run_id.slice(0, 8)}</Badge>
          {run.parent_run_id && (
            <Badge variant="secondary">
              variant of {run.parent_run_id.slice(0, 8)}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          disabled={exporting || panelUrls.length < 2}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {exporting ? "Composing…" : "Export strip"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {run.steps.map((step, i) => (
          <PanelCard
            key={step.step_id}
            step={step}
            index={i}
            isHero={i === 0}
            regenerating={regeneratingStep === i}
            onRegenerate={
              i === 0
                ? undefined
                : () => onRegenerate(`Panel ${i}, restyled variant`)
            }
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Provenance: every asset above carries a SHA-256 manifest from Genblaze.
        Manifest hash{" "}
        <code className="font-mono">{manifestHash.slice(0, 16)}…</code>
      </p>
    </div>
  );
}
