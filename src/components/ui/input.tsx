import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl bg-secondary-foreground px-4 py-2 text-base shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary",
          "placeholder:text-secondary",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "text-primary",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
