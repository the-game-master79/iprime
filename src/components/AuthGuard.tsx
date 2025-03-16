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

    const isPublicRoute = ['/auth/login', '/auth/register', '/'].includes(location.pathname);

    if (!user && !isPublicRoute && !authPage) {
      // Redirect to login for any non-public route when user is not authenticated
      navigate('/auth/login', { state: { from: location.pathname } });
    } else if (user && authPage) {
      // Redirect authenticated users away from auth pages
      navigate('/dashboard');
    }
  }, [user, loading, authPage, navigate, location]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};
