import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ScreenConflictOverlay() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4 border border-border">
        <h2 className="text-xl font-semibold mb-4">Trading Screen Already Open</h2>
        <p className="text-muted-foreground mb-6">
          You already have a trading screen open. Please close it before opening another one.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/trade')}
          >
            Go to Trading Screen
          </Button>
        </div>
      </div>
    </div>
  );
}
