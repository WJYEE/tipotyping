import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "success" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent-soft text-text-primary",
  success: "bg-success text-text-primary",
  secondary: "bg-surface text-text-primary",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-pill border-2 border-border-strong px-6 py-3 font-body font-bold shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
