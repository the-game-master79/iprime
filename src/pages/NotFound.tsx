
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-6">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">Oops! The page you're looking for can't be found.</p>
        <Link to="/">
          <Button className="mt-4">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
