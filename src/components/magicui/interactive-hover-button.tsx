import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  dotColor?: string;
  hoverTextColor?: string;
}

export const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ 
  children, 
  className, 
  dotColor = "bg-primary", 
  hoverTextColor = "text-background",
  ...props 
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative w-auto cursor-pointer overflow-hidden rounded-xl border bg-background p-2 px-6 text-center font-semibold",
        className,
      )}
      {...props}
    >
      <div className="flex w-full justify-center items-center gap-2">
        <div className={cn("h-2 w-2 rounded-xl transition-all duration-300 group-hover:scale-[100.8]", dotColor)}></div>
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100",
        hoverTextColor
      )}>
        <span>{children}</span>
        <ArrowRight size={16} className={hoverTextColor} />
      </div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";
export default InteractiveHoverButton;