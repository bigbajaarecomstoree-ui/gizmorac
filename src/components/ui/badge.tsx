import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium leading-none",
  {
    variants: {
      variant: {
        accent: "bg-accent text-on-accent",
        soft: "bg-accent-soft text-accent-bright border border-accent-dim/40",
        surface: "bg-surface-2 text-muted border border-border",
        success: "bg-success/15 text-success border border-success/30",
        danger: "bg-danger/15 text-danger border border-danger/30",
      },
      size: {
        sm: "px-2 py-1 text-[0.6875rem]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "soft", size: "sm" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}
