import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-[color,background-color,border-color,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 data-[state=loading]:cursor-wait data-[state=error]:border-destructive data-[state=success]:border-success",
  {
    variants: {
      variant: {
        default: "border border-primary bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
        secondary: "border border-secondary bg-secondary text-secondary-foreground hover:bg-muted",
        outline: "border border-control bg-background text-foreground hover:bg-muted",
        ghost: "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "min-h-0 border-0 p-0 text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11",
        sm: "h-11 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
