import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronUpIcon, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useBreakpoints } from "@/hooks/use-breakpoints";

interface PriceData {
  price: string;
  change: string;
  bid?: string;
  ask?: string;
}

const MobileTrade = () => {
  const { isMobile } = useBreakpoints();
  const navigate = useNavigate();
  const { symbol } = useParams();
  const { toast } = useToast();
  const decodedSymbol = symbol ? decodeURIComponent(symbol) : '';
  const [userBalance, setUserBalance] = useState(0);
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState("100");

  // Redirect to desktop version if not mobile
  if (!isMobile) {
    return <Navigate to="/trade" />;
  }

  // Fetch user balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserBalance(data.withdrawal_wallet);
      }
    };

    fetchUserBalance();
  }, []);

  // Calculate required margin based on amount and leverage
  const calculateMargin = () => {
    const amountValue = parseFloat(amount) || 0;
    const leverageValue = parseFloat(leverage) || 1;
    return amountValue / leverageValue;
  };

  // Handle trade submission
  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!amount || isNaN(parseFloat(amount))) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid trade amount",
        variant: "destructive"
      });
      return;
    }

    const margin = calculateMargin();
    if (margin > userBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Required margin: $${margin.toFixed(2)}`,
        variant: "destructive"
      });
      return;
    }

    // Add trade logic here
    toast({
      title: "Trade Opened",
      description: `${type.toUpperCase()} position opened for ${decodedSymbol.split(':')[1]}`,
    });
  };

  const priceData = pairPrices[decodedSymbol] || { price: '0', change: '0', bid: '0', ask: '0' };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/trade')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-3 font-medium">{decodedSymbol.split(':')[1]}</h1>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">${userBalance.toLocaleString()}</span>
        </div>
      </header>

      {/* Chart Area */}
      <div className="flex-1 relative min-h-0">
        <TradingViewWidget symbol={decodedSymbol} />
      </div>

      {/* Trading Controls */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="m-4 w-[calc(100%-2rem)]">
            <ChevronUpIcon className="h-4 w-4 mr-2" />
            Trade {decodedSymbol.split(':')[1]}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80%] px-0">
          <SheetHeader className="px-4">
            <SheetTitle>
              <div className="flex items-center justify-between">
                <span>{decodedSymbol.split(':')[1]}</span>
                <Badge variant="outline" className={cn(
                  parseFloat(priceData.change) >= 0 ? "border-green-500 text-green-500" : "border-red-500 text-red-500"
                )}>
                  {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
                </Badge>
              </div>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-full mt-2 px-4">
            <div className="space-y-6">
              {/* Price Information */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Buy Price</div>
                  <div className="text-lg font-semibold">${priceData.ask || '0.00000'}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Sell Price</div>
                  <div className="text-lg font-semibold">${priceData.bid || '0.00000'}</div>
                </div>
              </div>

              {/* Trading Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Amount (USD)</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Leverage</label>
                  <Input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    placeholder="Enter leverage"
                    className="mt-1.5"
                  />
                </div>

                {/* Margin Info */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Required Margin</span>
                    <span className="font-medium">${calculateMargin().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Action Buttons - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleTrade('buy')}
              >
                Buy
              </Button>
              <Button 
                variant="outline"
                className="w-full border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => handleTrade('sell')}
              >
                Sell
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileTrade;
