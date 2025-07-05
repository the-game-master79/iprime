import React from "react";
import { cn } from "../../lib/utils";
export { buttonVariants } from "./button-variants";
import { buttonVariants, type ButtonVariants } from "./button-variants";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, children, icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, className })
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