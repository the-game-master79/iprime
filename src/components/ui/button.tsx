import React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-background text-foreground border-border",
  secondary: "bg-background text-foreground border-border",
  danger: "bg-background text-foreground border-border",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-xl px-6 font-medium",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-2">
          {children}
          {icon && React.isValidElement(icon) && (
            <span className="ml-1">
              {React.cloneElement(
                icon as React.ReactElement<any>,
                {
                  className: cn(
                    (icon as React.ReactElement<any>).props.className || "",
                    "h-4 w-4"
                  ),
                }
              )}
            </span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";