import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-2xl border-2 border-input bg-card px-4 py-3 text-base shadow-sm transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
