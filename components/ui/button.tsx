import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 focus-visible:ring-4 focus-visible:ring-ring/40 active:scale-[0.97] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:brightness-105",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:brightness-105 focus-visible:ring-destructive/30",
        success:
          "bg-success text-success-foreground shadow-sm hover:brightness-105 focus-visible:ring-success/30",
        outline:
          "border-2 border-border bg-card text-foreground hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 text-base has-[>svg]:px-5",
        sm: "h-9 px-4 text-sm has-[>svg]:px-3",
        lg: "h-14 px-8 text-lg has-[>svg]:px-6",
        xl: "h-16 px-10 text-xl has-[>svg]:px-8 [&_svg:not([class*='size-'])]:size-7",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
