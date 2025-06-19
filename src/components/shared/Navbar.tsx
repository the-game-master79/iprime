import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sun, Moon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

export const Navbar = ({ variant }: { variant?: "blogs" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme, theme } = useTheme();

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
    // Prevent navigation to /trading, only allow tradingstation for logged in users
    if (path === "/trading") {
      window.open("/tradingstation", "_blank");
      return;
    }
    // All other routes (public) can be navigated to directly
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Detect if variant is blogs or if current path is /blogs or /blogs/:slug
  const isBlogsVariant =
    variant === "blogs" || location.pathname.startsWith("/blogs");

  return (
    <header className="w-full py-3 absolute top-0 left-0 z-20 mt-4">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={
                  isBlogsVariant
                    ? theme === "dark"
                      ? "/cf-dark.svg"
                      : "/cf-light.svg"
                    : "/cf-dark.svg"
                }
                alt="CloudForex Logo"
                className="h-6 w-auto"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-3">
              {[
                { path: "/trading", label: "Trading" },
                { path: "/alphaquant", label: "AlphaQuant" },
                { path: "/partners", label: "Partners" },
                { path: "/company", label: "Company" },
                { path: "/blogs", label: "Blogs" },
              ].map((item) =>
                item.path === "/trading" ? (
                  <a
                    key={item.path}
                    href="/tradingstation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-base font-normal px-3 py-2 transition-colors",
                      isBlogsVariant ? "text-foreground" : "text-white"
                    )}
                    style={{ border: "none", borderRadius: 0, background: "none" }}
                  >
                    {item.label}
                  </a>
                ) : item.path === "/alphaquant" ? (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "text-base font-normal px-3 py-2 transition-colors",
                      isActive(item.path)
                        ? isBlogsVariant
                          ? "text-foreground"
                          : ""
                        : isBlogsVariant
                        ? "text-foreground"
                        : "text-white"
                    )}
                    style={{ border: "none", borderRadius: 0, background: "none" }}
                  >
                    {isActive(item.path) ? (
                      <>
                        <span style={{ color: isBlogsVariant ? "inherit" : "#000" }}>
                          Alpha
                        </span>
                        <span
                          style={{
                            color: isBlogsVariant ? "inherit" : "#FF9900",
                          }}
                        >
                          Quant
                        </span>
                      </>
                    ) : (
                      "AlphaQuant"
                    )}
                  </button>
                ) : (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "text-base font-normal px-3 py-2 transition-colors",
                      isBlogsVariant ? "text-foreground" : "text-white",
                      isActive(item.path) && "underline underline-offset-4"
                    )}
                    style={{ border: "none", borderRadius: 0, background: "none" }}
                  >
                    {item.label}
                  </button>
                )
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "flex items-center justify-center",
                isBlogsVariant ? "text-foreground" : "text-white"
              )}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" && <Sun className="h-5 w-5" weight="bold" />}
              {theme !== "dark" && <Moon className="h-5 w-5" weight="bold" />}
            </Button>
            <Link to={user ? "/platform" : "/auth/login"}>
              <Button className="px-6 bg-card text-card-foreground hover:bg-card/95 rounded-md">
                {user ? (
                  <>
                    <span className="hidden md:inline">Access Platform</span>
                    <span className="inline md:hidden">Dashboard</span>
                  </>
                ) : (
                  <>
                    <span className="hidden md:inline">Register</span>
                    <span className="inline md:hidden">Register</span>
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
