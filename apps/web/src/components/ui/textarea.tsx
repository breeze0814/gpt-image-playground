import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-36 w-full resize-y rounded-md border border-control bg-background px-3 py-3 pr-9 text-base leading-7 text-foreground outline outline-2 outline-transparent transition-[color,background-color,border-color,opacity] duration-200 ease-out placeholder:text-muted-foreground hover:bg-muted/50 active:border-foreground focus-visible:border-foreground focus-visible:outline-ring focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:outline-destructive", className)} {...props} />;
}
