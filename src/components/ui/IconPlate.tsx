import type { HTMLAttributes } from "react";

type IconPlateTone = "accent" | "success" | "danger" | "warning";

interface IconPlateProps extends HTMLAttributes<HTMLDivElement> {
  tone?: IconPlateTone;
}

const toneClasses: Record<IconPlateTone, string> = {
  accent: "bg-accent-soft",
  success: "bg-success-soft",
  danger: "bg-danger-soft",
  warning: "bg-warning-soft",
};

export function IconPlate({ tone = "accent", className = "", ...props }: IconPlateProps) {
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-icon ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
