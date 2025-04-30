import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui-components";
import { Input } from "@/components/ui/input";
import { Search, Plus, Pencil, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface TradingPair {
  id: string;
  symbol: string;
  name: string;
  short_name: string;
  type: 'crypto' | 'forex';
  min_leverage: number;
  max_leverage: number;
  leverage_options: number[];
  is_active: boolean;
  display_order: number;
  image_url?: string;
  pip_value: number;
}

interface PairDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  pair?: TradingPair;
}

const defaultPairState = {
  symbol: '',
  name: '',
  short_name: '',
  type: 'crypto' as 'crypto' | 'forex',
  min_leverage: 1,
  max_leverage: 100,
  leverage_options: [1, 2, 5, 10, 20, 50, 100],
  is_active: true,
  display_order: 0,
  image_url: '',
  pip_value: 0.00001,
};

// Add helper function for generating leverage options
const generateLeverageOptions = (maxLeverage: number): number[] => {
  const baseOptions = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  return baseOptions.filter(opt => opt <= maxLeverage);
};

const Pairs = () => {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dialogState, setDialogState] = useState<PairDialogState>({ isOpen: false, mode: 'create' });
  const [formState, setFormState] = useState(defaultPairState);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPairs = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPairs(data || []);
    } catch (error) {
      console.error('Error fetching pairs:', error);
      toast.error("Failed to fetch trading pairs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, []);

  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = 
      pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || pair.type === selectedType;
    return matchesSearch && matchesType;
  });

  const togglePairStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('trading_pairs')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setPairs(prev => prev.map(pair => 
        pair.id === id ? { ...pair, is_active: !currentStatus } : pair
      ));

      toast.success("Trading pair status updated");
    } catch (error) {
      console.error('Error updating pair status:', error);
      toast.error("Failed to update pair status");
    }
  };

  const handleCreatePair = () => {
    setFormState(defaultPairState);
    setDialogState({ isOpen: true, mode: 'create' });
  };

  const handleEditPair = (pair: TradingPair) => {
    setFormState(pair);
    setDialogState({ isOpen: true, mode: 'edit', pair });
  };

  const handleSavePair = async () => {
    try {
      setIsSaving(true);
      
      // Ensure pip_value is a number
      const formData = {
        ...formState,
        pip_value: parseFloat(formState.pip_value.toString())
      };

      const table = supabase.from('trading_pairs');
      
      const operation = dialogState.mode === 'create'
        ? table.insert([formData])
        : table.update(formData).eq('id', dialogState.pair?.id);

      const { error } = await operation;
      if (error) throw error;

      toast.success(`Trading pair ${dialogState.mode === 'create' ? 'created' : 'updated'} successfully`);
      await fetchPairs(); // Use await to ensure data is refreshed
      setDialogState({ isOpen: false, mode: 'create' });
    } catch (error) {
      console.error('Error saving pair:', error);
      toast.error(`Failed to ${dialogState.mode} trading pair`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add helper function to parse currencies from symbol
  const parseCurrencies = (symbol: string) => {
    if (symbol.startsWith('BINANCE:')) {
      const pair = symbol.replace('BINANCE:', '');
      return {
        base: pair.replace('USDT', ''),
        quote: 'USDT'
      };
    } else if (symbol.startsWith('FX:')) {
      const [base, quote] = symbol.replace('FX:', '').split('/');
      return { base, quote };
    }
    return { base: '', quote: '' };
  };

  // Add effect to update base/quote when symbol changes
  useEffect(() => {
    if (formState.symbol) {
      const { base, quote } = parseCurrencies(formState.symbol);
      setFormState(prev => ({
        ...prev,
        base_currency: base,
        quote_currency: quote
      }));
    }
  }, [formState.symbol]);

  const handlePipValueChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setFormState(prev => ({
      ...prev,
      pip_value: numValue
    }));
  };

  // Update max leverage handler
  const handleMaxLeverageChange = (value: string) => {
    const maxLeverage = parseInt(value);
    if (isNaN(maxLeverage)) return;

    setFormState(prev => ({
      ...prev,
      max_leverage: maxLeverage,
      leverage_options: generateLeverageOptions(maxLeverage)
    }));
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Trading Pairs</h2>
            <Button onClick={handleCreatePair} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Pair
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pairs..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="forex">Forex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Leverage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPairs.map((pair) => (
                  <TableRow key={pair.id}>
                    <TableCell className="font-medium">{pair.symbol}</TableCell>
                    <TableCell>{pair.name}</TableCell>
                    <TableCell>{pair.short_name}</TableCell>
                    <TableCell>
                      <Badge variant={pair.type === 'crypto' ? 'default' : 'secondary'}>
                        {pair.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{pair.min_leverage}x - {pair.max_leverage}x</TableCell>
                    <TableCell>
                      <Switch 
                        checked={pair.is_active}
                        onCheckedChange={() => togglePairStatus(pair.id, pair.is_active)}
                      />
                    </TableCell>
                    <TableCell>{pair.display_order}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditPair(pair)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={dialogState.isOpen} onOpenChange={(open) => setDialogState(prev => ({ ...prev, isOpen: open }))}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{dialogState.mode === 'create' ? 'Add New Trading Pair' : 'Edit Trading Pair'}</DialogTitle>
                <DialogDescription>
                  {dialogState.mode === 'create' 
                    ? 'Add a new trading pair to the platform.' 
                    : 'Modify the existing trading pair details.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="symbol" className="text-right">Symbol</Label>
                  <Input
                    id="symbol"
                    value={formState.symbol}
                    onChange={(e) => setFormState(prev => ({ ...prev, symbol: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input
                    id="name"
                    value={formState.name}
                    onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="short_name" className="text-right">Short Name</Label>
                  <Input
                    id="short_name"
                    value={formState.short_name}
                    onChange={(e) => setFormState(prev => ({ ...prev, short_name: e.target.value }))}
                    className="col-span-3"
                    placeholder="E.g. BTC, EUR"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Base/Quote</Label>
                  <div className="col-span-3 grid grid-cols-2 gap-4">
                    <Input
                      value={formState.base_currency || ''}
                      disabled
                      className="bg-muted"
                      placeholder="Base Currency"
                    />
                    <Input
                      value={formState.quote_currency || ''}
                      disabled
                      className="bg-muted"
                      placeholder="Quote Currency"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Select
                    value={formState.type}
                    onValueChange={(value: 'crypto' | 'forex') => setFormState(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="forex">Forex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="min_leverage" className="text-right">Min Leverage</Label>
                  <Input
                    id="min_leverage"
                    type="number"
                    value={formState.min_leverage}
                    onChange={(e) => setFormState(prev => ({ ...prev, min_leverage: parseInt(e.target.value) }))}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max_leverage" className="text-right">Max Leverage</Label>
                  <Input
                    id="max_leverage"
                    type="number"
                    value={formState.max_leverage}
                    onChange={(e) => handleMaxLeverageChange(e.target.value)}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="image_url" className="text-right">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formState.image_url || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, image_url: e.target.value }))}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pip_value" className="text-right">Pip Value</Label>
                  <Input
                    id="pip_value"
                    type="number"
                    value={formState.pip_value}
                    onChange={(e) => handlePipValueChange(e.target.value)}
                    className="col-span-3 font-mono"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSaving} onClick={handleSavePair}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogState.mode === 'create' ? 'Create Pair' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageTransition>
    </AdminLayout>
  );
};

export default Pairs;