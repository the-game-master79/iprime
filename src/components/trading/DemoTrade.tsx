import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { calculatePnL } from "@/utils/trading";
import { Trade } from "@/types/trading";
import { Calculator } from "lucide-react";
import { wsManager } from "@/services/websocket-manager"; // Add WebSocket manager import
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DemoTradeProps {
  currentPrice: number;
  pair: string;
  tradingPairs?: any[];
  className?: string;
}

export const DemoTrade = ({ currentPrice, pair, tradingPairs, className }: DemoTradeProps) => {
  const [open, setOpen] = useState(false);
  const [demoTrade, setDemoTrade] = useState<Trade>({
    id: 'demo',
    pair,
    type: 'buy',
    status: 'open',
    openPrice: currentPrice,
    lots: 0.01
  });
  const [targetPrice, setTargetPrice] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [pnl, setPnl] = useState(0);
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});

  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      setPairPrices(prev => ({
        ...prev,
        [symbol]: data
      }));
    });

    wsManager.watchPairs(tradingPairs?.map(p => p.symbol) || []);

    return () => {
      unsubscribe();
      wsManager.unwatchPairs(tradingPairs?.map(p => p.symbol) || []);
    };
  }, [tradingPairs]);

  useEffect(() => {
    setDemoTrade(prev => ({
      ...prev,
      openPrice: parseFloat(pairPrices[demoTrade.pair]?.bid || '0')
    }));
  }, [pairPrices, demoTrade.pair]);

  useEffect(() => {
    if (targetPrice && demoTrade.openPrice) {
      const calculatedPnl = calculatePnL(
        { ...demoTrade, type: activeTab },
        targetPrice,
        tradingPairs
      );
      setPnl(calculatedPnl);
    }
  }, [targetPrice, demoTrade, activeTab, tradingPairs]);

  const handleTargetPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value > 0) {
      setTargetPrice(value);
    }
  };

  const handleLotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value > 0) {
      setDemoTrade(prev => ({
        ...prev,
        lots: value
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}> {/* Ensure dark background */}
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Calculator className="h-4 w-4 mr-2" />
          PnL Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 bg-[#FFFFFF] text-black"> {/* Ensure text color is black */}
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Demo Trade Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-black"> {/* Ensure text color is black */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Trading Pair</label>
              <Select value={demoTrade.pair} onValueChange={(value) => setDemoTrade(prev => ({ ...prev, pair: value }))}>
                <SelectTrigger className="text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tradingPairs?.map(pair => (
                    <SelectItem key={pair.symbol} value={pair.symbol}>
                      {pair.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'buy' | 'sell')}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Entry Price</label>
              <Input 
                type="number"
                value={demoTrade.openPrice.toFixed(5)}
                readOnly
                className=" cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Target Price</label>
              <Input 
                type="number"
                onChange={handleTargetPriceChange}
                placeholder="Enter target price"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Lots</label>
              <Input 
                type="number"
                value={demoTrade.lots}
                onChange={handleLotsChange}
                step="0.01"
                min="0.01"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-sm text-black">Current Price:</span>
                <span className="font-mono">${pairPrices[demoTrade.pair]?.bid || '0.00000'}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-black">Unrealized P&L:</span>
                <span className={`font-mono font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${pnl.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
