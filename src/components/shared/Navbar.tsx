import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowCircleRight, CaretDown, Moon, Sun } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setTheme, theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1200px]">
      <div
        className={cn(
          "mx-2 md:mx-auto rounded-2xl px-2 py-2",
          scrolled
            ? "backdrop-blur-sm bg-background/95 border border-border"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={
                theme === "dark"
                  ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-dark.svg"
                  : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-light.svg"
              }
              alt="CloudForex Logo"
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {['investing', 'partners', 'company'].map((item) => (
              <button
                key={item}
                onClick={() => handleNavigation(`/${item}`)}
                className={cn(
                  "text-sm font-medium px-4 py-2 rounded-2xl transition-colors",
                  "text-muted-foreground",
                  "hover:text-primary hover:bg-primary/10",
                  isActive(`/${item}`) && "text-primary bg-primary/10"
                )}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {/* Theme toggle button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" weight="bold" />
              ) : (
                <Moon className="h-5 w-5" weight="bold" />
              )}
            </Button>
            <Link to={user ? "/platform" : "/auth/login"}>
              <Button variant="default" className="rounded-xl px-6 gap-2">
                {/* Desktop: Access Platform, Mobile: Dashboard */}
                {user ? (
                  <>
                    <span className="hidden md:inline">Access Platform</span>
                    <span className="inline md:hidden">Dashboard</span>
                  </>
                ) : (
                  "Open Account"
                )}
                <ArrowCircleRight weight="bold" className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
