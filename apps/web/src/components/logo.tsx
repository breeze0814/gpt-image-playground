import { Aperture } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex min-h-11 items-center gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:opacity-80", className)}>
      <span className="flex size-8 items-center justify-center rounded-md border border-control bg-background text-primary">
        <Aperture aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </span>
      {!compact && <span className="font-display text-base sm:text-lg">Image Playground</span>}
    </Link>
  );
}
