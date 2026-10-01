import type { HTMLAttributes } from "react";

/** Career 전용 flat 패널. Learning의 Card(둥근 radius + hard shadow)와 달리 얇은 보더만 쓴다. */
export function CareerCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[8px] border border-career-border bg-career-surface ${className}`}
      {...props}
    />
  );
}
