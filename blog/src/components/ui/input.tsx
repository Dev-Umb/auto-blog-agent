import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "neu-input flex h-10 w-full rounded-xl px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
