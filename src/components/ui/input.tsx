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
            "peer flex h-12 w-full rounded-xl border border-input bg-background px-4 pt-4 pb-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            rightIcon ? "pr-10" : "", // Add right padding if icon present
            type === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : '',
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
              isFilled ? "top-1.5 -translate-y-0 text-xs text-primary px-1" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground",
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

interface LotsInputProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export const LotsInput: React.FC<LotsInputProps & { error?: string; helperText?: React.ReactNode; disabledText?: string; }> = ({
  label,
  value,
  min = 1,
  max = 100,
  step = 1,
  onChange,
  disabled,
  className,
  error,
  helperText,
  disabledText
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const isFilled = isFocused || value !== undefined;
  const inputId = label ? `lots-input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined;

  const handleDecrement = () => {
    if (!disabled && value > min) onChange(parseFloat((value - step).toFixed(5)));
  };
  const handleIncrement = () => {
    if (!disabled && value < max) onChange(parseFloat((value + step).toFixed(5)));
  };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d.]/g, "");
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    val = val.replace(/^0+(?!\.)/, '');
    let num = parseFloat(val);
    if (!isNaN(num)) {
      num = Math.max(min, Math.min(max, parseFloat(num.toFixed(5))));
      onChange(num);
    } else if (val === "") {
      onChange(min);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className={cn(
            // Make button medium rounded
            "w-11 h-11 flex items-center justify-center rounded-xl bg-secondary-foreground text-primary text-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-primary",
            disabled || value <= min ? "opacity-50" : "hover:bg-primary/10"
          )}
          aria-label="Decrease lots"
        >
          -
        </button>
        <div className="relative flex-1">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            pattern="^[0-9]*[.,]?[0-9]*$"
            className={cn(
              // Remove extra padding for label, make input full height
              "peer flex h-11 w-full rounded-xl px-4 text-base shadow-sm transition-colors text-center",
              "placeholder:text-transparent",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:border-transparent",
              disabled ? "bg-secondary !text-muted-foreground" : "bg-secondary-foreground text-foreground",
              "md:text-sm",
              error ? "border border-red-500 focus-visible:ring-red-500/40" : "border border-transparent"
            )}
            value={value}
            onChange={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          />
          {disabled && disabledText && (
            <div className="absolute inset-0 flex items-center px-4 pointer-events-none select-none text-muted-foreground text-base">
              {disabledText}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className={cn(
            // Make button medium rounded
            "w-11 h-11 flex items-center justify-center rounded-xl bg-secondary-foreground text-primary text-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-primary",
            disabled || value >= max ? "opacity-50" : "hover:bg-primary/10"
          )}
          aria-label="Increase lots"
        >
          +
        </button>
      </div>
      {(error || helperText) && (
        <p
          id={error ? `${inputId}-error` : `${inputId}-helper`}
          className={cn(
            "mt-1 text-xs",
            error ? "text-red-500" : "text-muted-foreground"
          )}
        >
          {error ? error : helperText}
        </p>
      )}
    </div>
  );
};

export { Input }
