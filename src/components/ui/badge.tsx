import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-border-focus focus-visible:ring-accent/50 focus-visible:ring-[3px] aria-invalid:ring-status-error/20 aria-invalid:border-status-error transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-text-bright [a&]:hover:bg-accent-hover",
        secondary:
          "border-transparent bg-bg-tertiary text-text-primary [a&]:hover:bg-bg-hover",
        destructive:
          "border-transparent bg-status-error text-text-bright [a&]:hover:bg-status-error/90 focus-visible:ring-status-error/20",
        outline:
          "text-text-primary border-border [a&]:hover:bg-accent [a&]:hover:text-text-bright",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
