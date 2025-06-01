import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";

export const Footer = () => {
  const { theme } = useTheme();
  return (
    <footer className="border-t bg-background/5 py-8 md:py-12">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src={
                theme === "dark"
                  ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-dark.svg"
                  : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-light.svg"
              }
              alt="CloudForex Logo"
              className="h-8 w-auto"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
            <Link to="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link to="/legal/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link
              to="#"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={e => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent("open-contact-dialog"));
              }}
            >
              Contact Us
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CloudForex. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
