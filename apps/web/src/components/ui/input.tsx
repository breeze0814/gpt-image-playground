import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("flex h-11 w-full rounded-md border border-control bg-background px-3 pr-9 text-base text-foreground outline outline-2 outline-transparent transition-[color,background-color,border-color,opacity] duration-200 ease-out placeholder:text-muted-foreground hover:bg-muted/50 active:border-foreground focus-visible:border-foreground focus-visible:outline-ring focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:outline-destructive data-[state=success]:border-success", className)} {...props} />;
}
