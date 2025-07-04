import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { InteractiveHoverButton } from "../magicui/interactive-hover-button";

interface AuthActionButtonProps {
  className?: string;
}

export const AuthActionButton = ({ className = "" }: AuthActionButtonProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (user) {
      // User is logged in, navigate to platform
      navigate('/platform');
    } else {
      // User is not logged in, navigate to registration
      navigate('/auth/login');
    }
  };

  // Default styling that can be overridden
  const defaultClassName = "px-8 py-4 text-lg font-semibold shadow-lg";
  const finalClassName = className || defaultClassName;

  if (loading) {
    return (
      <InteractiveHoverButton
        className={finalClassName}
        disabled
      >
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          Loading...
        </div>
      </InteractiveHoverButton>
    );
  }

  return (
    <InteractiveHoverButton
      className={finalClassName}
      onClick={handleClick}
    >
      <div className="flex items-center justify-center">
        <span className="hidden md:inline">
          {user ? "Access Platform" : "Get Started"}
        </span>
        <span className="md:hidden">
          {user ? "Access" : "Register"}
        </span>
      </div>
    </InteractiveHoverButton>
  );
};