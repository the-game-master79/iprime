import * as React from "react"
import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  error?: string
  helperText?: React.ReactNode
  label?: string
  rightIcon?: React.ReactNode // Optional icon on the right
  disabledText?: string // Optional text to show when disabled
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, label, id, value, defaultValue, rightIcon, disabledText, disabled, ...props }, ref) => {
    // Determine if input is filled for floating label
    const [isFocused, setIsFocused] = React.useState(false)
    const isFilled = isFocused || Boolean(value ?? defaultValue)
    const inputId = id || (label ? `input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined)
    return (
      <div className="relative w-full">
        <input
          id={inputId}
          type={type}
          className={cn(
            "peer flex h-11 w-full rounded-xl px-4 pt-5 pb-2 text-base shadow-sm transition-colors",
            rightIcon ? "pr-12" : "", // Add right padding if icon present
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary",
            "placeholder:text-transparent", // hide placeholder for floating label
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:border-transparent",
            disabled ? "bg-secondary !text-muted-foreground" : "bg-secondary-foreground text-primary",
            "md:text-sm",
            error ? "border border-red-500 focus-visible:ring-red-500/40" : "border border-transparent",
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.name}-error` : helperText ? `${props.name}-helper` : undefined}
          value={value}
          defaultValue={defaultValue}
          onFocus={e => { setIsFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setIsFocused(false); props.onBlur?.(e) }}
          disabled={disabled}
          {...props}
        />
        {disabled && disabledText && (
          <div className="absolute inset-0 flex items-center px-4 pointer-events-none select-none text-muted-foreground text-base">
            {disabledText}
          </div>
        )}
        {rightIcon && (
          <div className="absolute right-0 top-0 bottom-0 my-auto flex items-center h-11 pr-3 pointer-events-none">
            {rightIcon}
          </div>
        )}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "pointer-events-none absolute left-4 z-10 origin-[0] select-none text-muted-foreground transition-all duration-200",
              // Center label vertically when not floating
              "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground",
              // Float label to top when filled or focused
              isFilled ? "top-1.5 text-xs text-primary -translate-y-0" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground",
              error && "text-red-500"
            )}
          >
            {label}
          </label>
        )}
        {(error || helperText) && (
          <p
            id={error ? `${props.name}-error` : `${props.name}-helper`}
            className={cn(
              "mt-1 text-xs",
              error ? "text-red-500" : "text-muted-foreground"
            )}
          >
            {error ? error : helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
