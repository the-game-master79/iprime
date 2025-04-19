import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean
}

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "span"
    
    return (
      <Comp
        ref={ref}
        className={cn(
          "absolute h-px w-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
          className
        )}
        {...props}
      />
    )
  }
)
VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }
