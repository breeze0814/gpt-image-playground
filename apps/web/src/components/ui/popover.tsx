"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({ className, align = "center", sideOffset = 8, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return <PopoverPrimitive.Portal><PopoverPrimitive.Content align={align} sideOffset={sideOffset} className={cn("z-[var(--z-dropdown)] w-80 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-soft outline-none", className)} {...props} /></PopoverPrimitive.Portal>;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
