import type { HTMLAttributes } from "react";

type BadgeTone = "accent" | "success" | "danger" | "warning";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  accent: "bg-accent-soft text-text-primary",
  success: "bg-success-soft text-text-primary",
  danger: "bg-danger-soft text-text-primary",
  warning: "bg-warning-soft text-text-primary",
};

export function Badge({ tone = "accent", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-badge px-2 py-0.5 font-body text-xs font-semibold ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
