import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  authPage?: boolean;
}

export const AuthGuard = ({ children, requireAuth = false, authPage = false }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/auth/login', '/auth/register', '/', '/auth/callback'];
    const isPublicRoute = publicPaths.includes(location.pathname);

    if (!user && requireAuth) {
      // Store the full path including search params and hash
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      navigate('/auth/login', { 
        state: { from: returnTo },
        replace: true 
      });
    } else if (user && authPage) {
      // Navigate to platform by default, unless there's a specific return path
      const returnPath = location.state?.from || '/platform';
      navigate(returnPath, { replace: true });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};
