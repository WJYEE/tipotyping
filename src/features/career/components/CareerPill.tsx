import type { HTMLAttributes } from "react";

export type CareerPillTone = "blue" | "purple" | "amber" | "green" | "red" | "neutral";

interface CareerPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone: CareerPillTone;
}

const toneClasses: Record<CareerPillTone, string> = {
  blue: "bg-career-blue-soft text-career-blue",
  purple: "bg-career-purple-soft text-career-purple",
  amber: "bg-career-amber-soft text-career-amber",
  green: "bg-career-green-soft text-career-green",
  red: "bg-career-red-soft text-career-red",
  neutral: "bg-career-table-header text-career-text-secondary",
};

/** Gap 유형/분석 상태 등에 쓰는 pill 배지. Learning의 Badge와 같은 모양이지만 Career 톤을 쓴다. */
export function CareerPill({ tone, className = "", ...props }: CareerPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-body text-[11px] font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
