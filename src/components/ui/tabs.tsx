import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Modified: Remove border for a cleaner look
      "inline-flex h-12 min-h-[3rem] items-center rounded-xl p-1 bg-secondary gap-1 relative w-auto",
      className
    )}
    style={{ width: 'fit-content' }}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    icon?: React.ReactNode;
  }
>(({ className, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Modified: Use secondary foreground for non-selected tabs
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-base font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-sm",
      "relative",
      className
    )}
    style={{ width: 'auto' }}
    {...props}
  >
    <div className="relative z-10 flex items-center gap-2 whitespace-nowrap">
      {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
      {children}
    </div>
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
      // Add smooth transition effects
      "overflow-hidden transition-all duration-300 ease-in-out",
      // Animation for inactive state
      "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=inactive]:slide-out-to-right-2",
      // Animation for active state
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-left-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
