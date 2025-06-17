import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import { useNavigate } from "react-router-dom";

interface PairDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pair: {
    symbol: string;
    name?: string;
    image_url?: string;
    type?: string;
  } | null;
}

const PairDetailsDialog: React.FC<PairDetailsDialogProps> = ({ open, onOpenChange, pair }) => {
  const navigate = useNavigate();
  if (!pair) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background p-4">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            {pair.image_url && (
              <img src={pair.image_url} alt={pair.symbol} className="w-9 h-9 object-contain" />
            )}
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-xl font-bold leading-tight mb-0 text-foreground">{pair.symbol}</DialogTitle>
              <div className="text-sm text-muted-foreground leading-tight font-medium">{pair.name || ''}</div>
            </div>
            <Badge variant="outline" className="ml-2 px-2 py-0.5 text-xs font-semibold">
              {pair.type === 'forex' ? 'Forex' : 'Crypto'}
            </Badge>
          </div>
        </DialogHeader>
        <div className="my-2">
          <div style={{ minHeight: 420, height: 420, width: '100%' }} className="w-full">
            <TradingViewWidget symbol={pair.symbol} />
          </div>
        </div>
        <Button className="w-full mt-2 rounded-md" onClick={() => { onOpenChange(false); navigate('/tradingstation'); }}>
          Trade
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PairDetailsDialog;
