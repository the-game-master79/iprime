import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import React from "react";

interface AccessPlatformButtonProps {
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  className?: string;
  size?: "sm" | "lg";
  navbar?: boolean; // Add navbar prop
}

/**
 * Shared Access Platform button for hero, navbar, CTA, etc.
 * Handles mobile/desktop visibility and consistent styling.
 */
export const AccessPlatformButton: React.FC<AccessPlatformButtonProps> = ({
  mobileOnly = false,
  desktopOnly = false,
  className = "",
  size,
  navbar = false, // Add navbar default
}) => {
  let visibility = "";
  if (mobileOnly) visibility = "block md:hidden w-full";
  else if (desktopOnly) visibility = "hidden md:inline-block";
  else visibility = "w-full md:w-auto";

  // Default size: sm for mobile, lg for desktop, sm for navbar
  const btnSize = size || (mobileOnly ? "sm" : navbar ? "sm" : "lg");

  // Adjust class for navbar
  const baseClass = navbar
    ? "gap-2 px-4 h-10 bg-card text-card-foreground hover:bg-card/95 text-sm transition-all rounded-md"
    : mobileOnly
    ? "gap-2 px-6 bg-card text-card-foreground hover:bg-card/95 text-base transition-all h-14 rounded-md w-full"
    : desktopOnly
    ? "gap-2 px-7 h-14 bg-card text-card-foreground hover:bg-card/95 text-lg md:text-2xl transition-all rounded-md"
    : "gap-2 px-7 h-14 bg-card text-card-foreground hover:bg-card/95 text-lg md:text-2xl transition-all rounded-md w-full md:w-auto";

  return (
    <Link to="/platform" className={visibility}>
      <Button
        size={btnSize}
        className={baseClass + (className ? ` ${className}` : "")}
      >
        Access Platform
      </Button>
    </Link>
  );
};

export default AccessPlatformButton;
