"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OrbitingCirclesProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: React.ReactNode[];
  distance?: number;
  mainContent?: React.ReactNode;
  itemClassName?: string;
  speed?: "slow" | "normal" | "fast";
}

const OrbitingCircles = React.forwardRef<HTMLDivElement, OrbitingCirclesProps>(
  ({ className, items = [], distance = 85, mainContent, itemClassName, speed = "normal", ...props }, ref) => {
    const itemCount = items.length;
    const angleStep = 360 / itemCount;

    return (
      <div
        ref={ref}
        className={cn("relative h-[200px] w-[200px]", className)}
        style={{ "--orbit-distance": `${distance}px` } as React.CSSProperties}
        {...props}
      >
        {/* Main centered content */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {mainContent}
        </div>

        {/* Orbiting items */}
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              `animate-orbit-${speed}`,
              itemClassName
            )}
            style={{
              transformOrigin: "50% 50%",
              rotate: `${angleStep * index}deg`,
            }}
          >
            <div className="animate-orbit-item">{item}</div>
          </div>
        ))}
      </div>
    );
  }
);

OrbitingCircles.displayName = "OrbitingCircles";

export { OrbitingCircles };
