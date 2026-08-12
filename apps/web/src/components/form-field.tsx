import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  readonly htmlFor: string;
  readonly label: string;
  readonly children: ReactNode;
  readonly description?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly className?: string | undefined;
}

export function FormField({ htmlFor, label, children, description, error, required, className }: FormFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
      <p id={`${htmlFor}-message`} className={error ? "min-h-5 text-sm text-destructive" : "min-h-5 text-sm text-muted-foreground"}>
        {error ?? description ?? "\u00a0"}
      </p>
    </div>
  );
}
