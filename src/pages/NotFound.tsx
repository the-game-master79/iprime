import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (currentUser) return;
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    checkAuth();
  }, [currentUser]);

  const isAuthenticated = !!currentUser;

  const isProtectedRoute = [
    '/dashboard',
    '/profile',
    '/payments',
    '/withdrawals',
    '/rank',
    '/affiliate',
    '/support' // Add this line
  ].some(route => location.pathname.startsWith(route));

  // Log the attempted access
  useEffect(() => {
    if (isProtectedRoute && !isAuthenticated) {
      console.error(
        "Unauthorized access attempt:",
        location.pathname
      );
    } else if (!isProtectedRoute) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname, isProtectedRoute, isAuthenticated]);

  if (isProtectedRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 p-6 max-w-md">
          <div className="mx-auto w-fit rounded-full bg-primary/10 p-3">
            <AlertCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground">
            Please log in to access this page. If you don't have an account, you can create one.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link to="/auth/login">
              <Button variant="default">Login</Button>
            </Link>
            <Link to="/auth/register">
              <Button variant="outline">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-6">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">
          Oops! The page you're looking for can't be found.
        </p>
        <Link to="/">
          <Button className="mt-4">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
