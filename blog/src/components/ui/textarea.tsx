import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "neu-input min-h-[100px] w-full rounded-xl px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
