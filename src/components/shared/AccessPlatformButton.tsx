import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
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

  // Show Register if not signed in, else Access Platform
  const buttonText = user ? "Access Platform" : "Register";
  const buttonLink = user ? "/platform" : "/auth/login";

  return (
    <Link to={buttonLink} className={visibility}>
      <Button
        size={btnSize}
        className={baseClass + (className ? ` ${className}` : "")}
      >
        {buttonText}
      </Button>
    </Link>
  );
};

export default AccessPlatformButton;
