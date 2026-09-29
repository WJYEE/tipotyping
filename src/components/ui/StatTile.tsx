import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { IconPlate } from "@/components/ui/IconPlate";

type StatTone = "accent" | "success" | "danger" | "warning" | "info";

interface StatTileProps {
  icon: ReactNode;
  tone: StatTone;
  label: string;
  value: string;
}

export function StatTile({ icon, tone, label, value }: StatTileProps) {
  return (
    <Card className="flex flex-1 items-center gap-4 !p-4">
      <IconPlate tone={tone}>{icon}</IconPlate>
      <div className="flex flex-col gap-0.5">
        <p className="font-body text-[13px] text-text-secondary">{label}</p>
        <p className="font-display text-xl font-extrabold text-text-primary">{value}</p>
      </div>
    </Card>
  );
}
