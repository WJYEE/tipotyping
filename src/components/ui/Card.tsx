import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  emphasized?: boolean;
}

export function Card({ emphasized = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border-2 border-border-strong bg-surface p-6 ${
        emphasized ? "shadow-hard" : ""
      } ${className}`}
      {...props}
    />
  );
}
