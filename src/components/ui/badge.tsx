import * as React from "react";
import { cn } from "@/lib/utils";

const base = "inline-flex items-center gap-1.5 rounded-full font-medium leading-none";

const variants: Record<string, string> = {
  accent: "bg-accent text-on-accent",
  highlight: "bg-highlight text-on-highlight",
  soft: "bg-accent-soft text-accent-bright border border-accent-dim/40",
  surface: "bg-surface-2 text-muted border border-border",
  success: "bg-success/15 text-success border border-success/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
};

const sizes: Record<string, string> = {
  sm: "px-2 py-1 text-[0.6875rem]",
  md: "px-2.5 py-1 text-xs",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "accent" | "highlight" | "soft" | "surface" | "success" | "danger";
  size?: "sm" | "md";
}

export function Badge({ className, variant = "soft", size = "sm", ...props }: BadgeProps) {
  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
