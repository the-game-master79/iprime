import { useState, useEffect } from "react";
import { Plus, Pencil, Trash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Promocode {
  id: string;
  code: string;
  description: string;
  type: 'multiplier' | 'cashback';
  usage_type: 'deposit' | 'plan';  // Add this field
  discount_percentage: number;
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
  expiry_date: string;
}

const PromocodesPage = () => {
  const { toast } = useToast();
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPromocode, setSelectedPromocode] = useState<Promocode | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "cashback" as "multiplier" | "cashback",
    usage_type: "deposit" as "deposit" | "plan",  // Add this field
    discount_percentage: 0,
    min_amount: 0,
    max_amount: 0,
    is_active: true,
    expiry_date: ""
  });

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const fetchPromocodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromocodes(data || []);
    } catch (error) {
      console.error('Error fetching promocodes:', error);
      toast({
        title: "Error",
        description: "Failed to load promocodes",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (promocode: Promocode) => {
    setSelectedPromocode(promocode);
    setFormData({
      code: promocode.code,
      description: promocode.description,
      type: promocode.type,
      usage_type: promocode.usage_type,  // Add this line
      discount_percentage: promocode.discount_percentage,
      min_amount: promocode.min_amount,
      max_amount: promocode.max_amount || 0,
      is_active: promocode.is_active,
      expiry_date: promocode.expiry_date
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promocode?')) return;
    
    try {
      const { error } = await supabase
        .from('promocodes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPromocodes(promocodes.filter(code => code.id !== id));
      toast({
        title: "Success",
        description: "Promocode deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting promocode:', error);
      toast({
        title: "Error",
        description: "Failed to delete promocode",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate usage type based on promo type
    if (formData.type === 'multiplier' && formData.usage_type !== 'deposit') {
      toast({
        title: "Invalid Configuration",
        description: "Multiplier codes can only be used for deposits",
        variant: "destructive"
      });
      return;
    }

    if (formData.type === 'cashback' && formData.usage_type !== 'plan') {
      toast({
        title: "Invalid Configuration", 
        description: "Cashback codes can only be used for plans",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare data for submission
      const submissionData = {
        ...formData,
        max_amount: formData.max_amount || null,
        // Set discount_percentage to null for multiplier type
        discount_percentage: formData.type === 'multiplier' ? null : formData.discount_percentage
      };

      if (selectedPromocode) {
        const { error } = await supabase
          .from('promocodes')
          .update({
            ...submissionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPromocode.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promocodes')
          .insert([submissionData]);

        if (error) throw error;
      }

      fetchPromocodes();
      setIsDialogOpen(false);
      setSelectedPromocode(null);
      setFormData({
        code: "",
        description: "",
        type: "cashback",
        usage_type: "deposit",  // Add this line
        discount_percentage: 0,
        min_amount: 0,
        max_amount: 0,
        is_active: true,
        expiry_date: ""
      });
      
      toast({
        title: "Success",
        description: `Promocode ${selectedPromocode ? 'updated' : 'created'} successfully`,
      });
    } catch (error) {
      console.error('Error saving promocode:', error);
      toast({
        title: "Error",
        description: `Failed to ${selectedPromocode ? 'update' : 'create'} promocode`,
        variant: "destructive"
      });
    }
  };

  // Update type selection to force correct usage_type
  const handleTypeChange = (value: 'multiplier' | 'cashback') => {
    setFormData(prev => ({
      ...prev,
      type: value,
      // Automatically set usage_type based on type
      usage_type: value === 'multiplier' ? 'deposit' : 'plan',
      // Reset discount_percentage when switching types
      discount_percentage: value === 'multiplier' ? 0 : prev.discount_percentage
    }));
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Promocodes" 
        description="Manage promotional codes and discounts"
        action={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Promocode
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Min Amount</TableHead>
              <TableHead>Max Amount</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promocodes.map((promocode) => (
              <TableRow key={promocode.id}>
                <TableCell className="font-medium">{promocode.code}</TableCell>
                <TableCell className="capitalize">{promocode.type}</TableCell>
                <TableCell>
                  {promocode.type === 'multiplier' ? '2X' : `${promocode.discount_percentage}%`}
                </TableCell>
                <TableCell>${promocode.min_amount}</TableCell>
                <TableCell>{promocode.max_amount ? `$${promocode.max_amount}` : '-'}</TableCell>
                <TableCell>
                  {new Date(promocode.expiry_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={promocode.is_active ? "success" : "secondary"}>
                    {promocode.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(promocode)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(promocode.id)}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedPromocode ? 'Edit Promocode' : 'Add New Promocode'}</DialogTitle>
            <DialogDescription>
              {selectedPromocode ? 'Update the promocode details' : 'Create a new promotional code'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="uppercase"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiplier">Multiplier (2X)</SelectItem>
                  <SelectItem value="cashback">Cashback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="usage_type">Usage Type</Label>
              <Input
                id="usage_type"
                value={formData.type === 'multiplier' ? 'Deposit' : 'Plan'}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                {formData.type === 'multiplier' 
                  ? 'Multiplier codes can only be used for deposits' 
                  : 'Cashback codes can only be used for plans'}
              </p>
            </div>

            {formData.type === 'cashback' && (
              <div className="grid gap-2">
                <Label htmlFor="discount_percentage">Discount Percentage</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                  required
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="min_amount">Minimum Amount</Label>
              <Input
                id="min_amount"
                type="number"
                min="0"
                value={formData.min_amount}
                onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_amount">Maximum Amount (Optional)</Label>
              <Input
                id="max_amount"
                type="number"
                min="0"
                value={formData.max_amount}
                onChange={(e) => setFormData({ ...formData, max_amount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="datetime-local"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                {selectedPromocode ? 'Save Changes' : 'Create Promocode'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default PromocodesPage;
