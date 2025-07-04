import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  interactive?: boolean; // Enable Magic UI interactive hover effect
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-background text-foreground border-border hover:bg-primary hover:text-background hover:border-primary/20",
  secondary: "bg-background text-foreground border-border hover:bg-secondary hover:text-background hover:border-secondary/20",
  danger: "bg-background text-foreground border-border hover:bg-destructive hover:text-background hover:border-destructive/20",
};

const interactiveVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-foreground",
  secondary: "bg-secondary text-foreground",
  danger: "bg-destructive text-foreground",
};

const interactiveInitialClasses: Record<ButtonVariant, string> = {
  primary: "bg-background text-foreground border-border",
  secondary: "bg-background text-foreground border-border",
  danger: "bg-background text-foreground border-border",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, icon, interactive = false, ...props }, ref) => {
    if (interactive) {
      return (
        <button
          ref={ref}
          className={cn(
            "group relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold transition-all duration-300 hover:shadow-lg",
            interactiveInitialClasses[variant],
            className,
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]",
              "bg-foreground/40 group-hover:bg-current"
            )}></div>
            <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
              {children}
            </span>
          </div>
          <div className={cn(
            "absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100",
            interactiveVariantClasses[variant]
          )}>
            <span>{children}</span>
            {icon || <ArrowRight className="h-4 w-4" />}
          </div>
        </button>
      );
    }

    // Fallback to regular button
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-xl px-6 font-medium transition-all duration-300 ease-out",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <span className="relative flex items-center gap-2 transition-all duration-300 ease-out group-hover:pr-4">
          {children}
          {icon && (
            <span className="ml-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 translate-x-2">
              {React.isValidElement(icon)
                ? React.cloneElement(
                    icon as React.ReactElement<any>,
                    {
                      className: cn(
                        (icon as React.ReactElement<any>).props.className || "",
                        "h-4 w-4"
                      ),
                    }
                  )
                : icon}
            </span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";