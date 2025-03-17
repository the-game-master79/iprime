import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth/login', { replace: true });
        }
      } catch (error) {
        console.error('Error during auth callback:', error);
        navigate('/auth/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium">Authenticating...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default Callback;
