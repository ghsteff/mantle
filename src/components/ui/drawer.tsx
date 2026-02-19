"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { XIcon } from "lucide-react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Drawer({
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      shouldScaleBackground={shouldScaleBackground}
      {...props}
    />
  );
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

const drawerContentVariants = cva(
  "group/drawer-content fixed z-50 flex flex-col border border-border bg-card/95 shadow-lg backdrop-blur-sm outline-none data-[state=open]:animate-in data-[state=closed]:animate-out duration-300",
  {
    variants: {
      direction: {
        bottom:
          "inset-x-0 bottom-0 max-h-[78vh] rounded-t-xl border-b-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        top: "inset-x-0 top-0 max-h-[78vh] rounded-b-xl border-t-0 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        right:
          "top-0 right-0 h-full w-80 rounded-l-xl border-r-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        left: "top-0 left-0 h-full w-80 rounded-r-xl border-l-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
      },
    },
    defaultVariants: {
      direction: "bottom",
    },
  }
);

type DrawerContentProps = React.ComponentProps<typeof DrawerPrimitive.Content> & {
  direction?: "top" | "bottom" | "left" | "right";
  showCloseButton?: boolean;
  showOverlay?: boolean;
  overlayClassName?: string;
};

function DrawerContent({
  className,
  children,
  direction = "bottom",
  showCloseButton = false,
  showOverlay = true,
  overlayClassName,
  ...props
}: DrawerContentProps) {
  const isVertical = direction === "top" || direction === "bottom";

  return (
    <DrawerPortal>
      {showOverlay && <DrawerOverlay className={cn("bg-transparent", overlayClassName)} />}
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(drawerContentVariants({ direction }), className)}
        {...props}
      >
        {isVertical && (
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border-subtle" />
        )}
        {children}
        {showCloseButton && (
          <DrawerPrimitive.Close
            data-slot="drawer-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-none"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.Close>
        )}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-sm font-semibold tracking-wide", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
