import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold tracking-[0.02em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary to-[#B8955A] text-white shadow-[0_2px_4px_rgba(201,166,107,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#D4B176] hover:to-primary hover:shadow-[0_4px_12px_rgba(201,166,107,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_2px_rgba(201,166,107,0.3)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0.5",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-white shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-white border-[1.5px] border-border text-foreground hover:bg-secondary hover:border-primary shadow-sm hover:-translate-y-0.5 active:translate-y-0.5",
        ghost: "text-primary hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
