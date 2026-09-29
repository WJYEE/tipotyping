import type { HTMLAttributes } from "react";

type IconPlateTone = "accent" | "success" | "danger" | "warning" | "info";

interface IconPlateProps extends HTMLAttributes<HTMLDivElement> {
  tone?: IconPlateTone;
}

const toneClasses: Record<IconPlateTone, string> = {
  accent: "bg-accent-soft",
  success: "bg-success-soft",
  danger: "bg-danger-soft",
  warning: "bg-warning-soft",
  info: "bg-info-soft",
};

export function IconPlate({ tone = "accent", className = "", ...props }: IconPlateProps) {
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-icon border-2 border-border-strong ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
