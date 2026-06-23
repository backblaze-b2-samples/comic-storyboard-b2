"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PANEL_OPTIONS = [3, 4, 6];

export function StoryForm({
  onSubmit,
  pending,
}: {
  onSubmit: (idea: string, panelCount: number) => void;
  pending: boolean;
}) {
  const [idea, setIdea] = useState("");
  const [panelCount, setPanelCount] = useState(4);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Describe your story</CardTitle>
        <CardDescription>
          One or two sentences. Claude scripts the panels, then a hero
          reference sheet anchors every panel for character consistency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <Textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="A lonely lighthouse keeper befriends a storm-petrel."
          rows={3}
          disabled={pending}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Panels:</span>
          {PANEL_OPTIONS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={panelCount === n ? "default" : "outline"}
              onClick={() => setPanelCount(n)}
              disabled={pending}
            >
              {n}
            </Button>
          ))}
        </div>
        <Button
          className="w-full"
          disabled={pending || idea.trim().length < 4}
          onClick={() => onSubmit(idea.trim(), panelCount)}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          {pending ? "Generating…" : "Generate storyboard"}
        </Button>
      </CardContent>
    </Card>
  );
}
