import * as React from "react";
import { cn } from "@/lib/utils";

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-main)]",
      className
    )}
    {...props}
  />
));
Alert.displayName = "Alert";

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />;
}
