import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AccessPlatformButton } from "@/components/shared/AccessPlatformButton";
import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";

export const Navbar = ({ variant }: { variant?: "blogs" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme, theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    // List of routes that require authentication
    const protectedRoutes = [
      "/platform",
      "/plans",
      "/affiliate",
      "/profile",
      "/cashier",
      "/promotions",
    ];
    // If the route is protected and user is not logged in, redirect to login
    if (protectedRoutes.some((r) => path.startsWith(r)) && !user) {
      navigate("/auth/login");
      return;
    }
    // All routes (public or not) can be navigated to directly, no reload for same path
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Detect if variant is blogs or if current path is /blogs or /blogs/:slug
  const isBlogsVariant =
    variant === "blogs" || location.pathname.startsWith("/blogs");

  return (
    <header
      className={cn(
        "w-full max-w-[1200px] mx-auto py-3 pl-6 pr-4 fixed top-6 left-1/2 -translate-x-1/2 z-30 bg-background/80 backdrop-blur-md shadow-lg rounded-xl border border-border text-foreground transition-all duration-300"
      )}
    >
      <div className="w-full">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              {/* Show logo based on theme, not just dark class */}
              <img
                src={theme === "dark" ? "/arthaa-dark.svg" : "/arthaa-light.svg"}
                alt="Arthaa Logo"
                className="h-6 w-auto"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { path: "/trading", label: "Trading" },
                { path: "/alphaquant", label: "AlphaQuant" },
                { path: "/blogs", label: "Blogs" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "text-base font-normal px-2 py-2 transition-colors text-foreground",
                    isActive(item.path) && "underline underline-offset-4"
                  )}
                  style={{ border: "none", borderRadius: 0, background: "none" }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggler */}
            <button
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent hover:bg-border transition-colors border border-border mr-1"
              type="button"
            >
              {theme === "dark" ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-blue-600" />
              )}
            </button>
            {user ? (
              <AccessPlatformButton
                navbar // Use the new navbar prop for compact style
                desktopOnly={false}
                mobileOnly={false}
              />
            ) : (
              <AccessPlatformButton
                navbar
                desktopOnly={false}
                mobileOnly={false}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
