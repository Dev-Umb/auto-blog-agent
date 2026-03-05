import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "neu-button text-[var(--text-main)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:-translate-y-0.5",
        primary:
          "rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_10px_24px_rgba(128,90,213,0.35)] hover:brightness-105",
        ghost:
          "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-soft)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";
