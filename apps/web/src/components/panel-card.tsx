"use client";

import Image from "next/image";
import { RefreshCw } from "lucide-react";
import type { Step } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// A single comic panel. Step 0 is the hero reference sheet (badged as such);
// later steps are story panels with a regenerate-variant action.
export function PanelCard({
  step,
  index,
  isHero,
  onRegenerate,
  regenerating,
}: {
  step: Step;
  index: number;
  isHero: boolean;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const asset = step.assets[0];

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative aspect-[3/2] p-0">
        {asset?.url ? (
          <Image
            src={asset.url}
            alt={isHero ? "Hero reference sheet" : `Panel ${index}`}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            no asset
          </div>
        )}
        <Badge className="absolute left-2 top-2" variant="secondary">
          {isHero ? "Hero sheet" : `Panel ${index}`}
        </Badge>
      </CardContent>
      {!isHero && onRegenerate && (
        <CardFooter className="justify-end p-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {regenerating ? "Re-rolling…" : "Variant"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
