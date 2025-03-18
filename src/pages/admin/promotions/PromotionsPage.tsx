import { useState, useEffect } from "react";
import { Plus, Image, Pencil, Trash, Layers, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, StatCard } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Promotion {
  id: string;
  title: string;
  image_url: string;
  link: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface CommissionLevel {
  id: number;
  level: number;
  percentage: number;
  description: string;
}

interface DepositMethod {
  id: string;
  method: 'bank_transfer' | 'crypto' | 'upi';
  crypto_name: string | null;
  crypto_symbol: string | null;
  network: string | null;
  logo_url: string | null;
  qr_code_url: string | null;
  deposit_address: string | null;
  is_active: boolean;
  min_amount: number;
}

interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
}

const availableRoutes = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/plans", label: "Investment Plans" },
  { value: "/affiliate", label: "Affiliate Program" },
  { value: "/rank", label: "My Rank" },
];

const PromotionsPage = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link: "",
    status: "active"
  });
  const [editingBanner, setEditingBanner] = useState<Promotion | null>(null);
  const [levels, setLevels] = useState<CommissionLevel[]>([]);
  const [isLevelsDialogOpen, setIsLevelsDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<CommissionLevel | null>(null);
  const [levelFormData, setLevelFormData] = useState({
    percentage: 0,
    description: "",
  });
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<DepositMethod | null>(null);
  const [depositFormData, setDepositFormData] = useState({
    method: 'crypto' as const,
    crypto_name: '',
    crypto_symbol: '',
    network: '',
    logo_url: '',
    qr_code_url: '',
    deposit_address: '',
    is_active: true,
    min_amount: 0
  });
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [isRankDialogOpen, setIsRankDialogOpen] = useState(false);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [rankFormData, setRankFormData] = useState({
    title: "",
    business_amount: 0,
    bonus: 0
  });

  useEffect(() => {
    fetchBanners();
    fetchLevels();
    fetchDepositMethods();
    fetchRanks();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast({
        title: "Error",
        description: "Failed to load banners",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_structures')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setLevels(data);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast({
        title: "Error",
        description: "Failed to load commission levels",
        variant: "destructive"
      });
    }
  };

  const fetchDepositMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('deposit_methods')
        .select('*')
        .order('method', { ascending: true });

      if (error) throw error;
      setDepositMethods(data || []);
    } catch (error) {
      console.error('Error fetching deposit methods:', error);
      toast({
        title: "Error",
        description: "Failed to load deposit methods",
        variant: "destructive"
      });
    }
  };

  const fetchRanks = async () => {
    try {
      const { data, error } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (error) throw error;
      setRanks(data || []);
    } catch (error) {
      console.error('Error fetching ranks:', error);
      toast({
        title: "Error",
        description: "Failed to load ranks",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBanners(banners.filter(banner => banner.id !== id));
      toast({
        title: "Success",
        description: "Banner deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (banner: Promotion) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link: banner.link,
      status: banner.status
    });
    setIsDialogOpen(true);
  };

  const handleEditLevel = (level: CommissionLevel) => {
    setSelectedLevel(level);
    setLevelFormData({
      percentage: level.percentage,
      description: level.description,
    });
    setIsLevelsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        const { data, error } = await supabase
          .from('promotions')
          .update(formData)
          .eq('id', editingBanner.id)
          .select()
          .single();

        if (error) throw error;

        setBanners(banners.map(banner => 
          banner.id === editingBanner.id ? data : banner
        ));
        toast({
          title: "Success",
          description: "Banner updated successfully",
        });
      } else {
        const { data, error } = await supabase
          .from('promotions')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;

        setBanners([data, ...banners]);
        toast({
          title: "Success",
          description: "Banner created successfully",
        });
      }

      setIsDialogOpen(false);
      setFormData({ title: "", image_url: "", link: "", status: "active" });
      setEditingBanner(null);
    } catch (error) {
      console.error('Error saving banner:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingBanner ? 'update' : 'create'} banner`,
        variant: "destructive"
      });
    }
  };

  const handleUpdateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLevel) return;

    try {
      const { error } = await supabase
        .from('commission_structures')
        .update({
          percentage: levelFormData.percentage,
          description: levelFormData.description,
        })
        .eq('id', selectedLevel.id);

      if (error) throw error;

      setLevels(levels.map(level =>
        level.id === selectedLevel.id
          ? { ...level, ...levelFormData }
          : level
      ));

      setIsLevelsDialogOpen(false);
      setSelectedLevel(null);
      toast({
        title: "Success",
        description: "Commission level updated successfully",
      });
    } catch (error) {
      console.error('Error updating level:', error);
      toast({
        title: "Error",
        description: "Failed to update commission level",
        variant: "destructive"
      });
    }
  };

  const handleEditDepositMethod = (method: DepositMethod) => {
    setSelectedDepositMethod(method);
    setDepositFormData({
      method: method.method,
      crypto_name: method.crypto_name || '',
      crypto_symbol: method.crypto_symbol || '',
      network: method.network || '',
      logo_url: method.logo_url || '',
      qr_code_url: method.qr_code_url || '',
      deposit_address: method.deposit_address || '',
      is_active: method.is_active,
      min_amount: method.min_amount
    });
    setIsDepositDialogOpen(true);
  };

  const handleDeleteDepositMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deposit_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDepositMethods(methods => methods.filter(method => method.id !== id));
      
      toast({
        title: "Success",
        description: "Deposit method deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting deposit method:', error);
      toast({
        title: "Error",
        description: "Failed to delete deposit method",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDepositMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepositMethod) return;

    try {
      const { error } = await supabase
        .from('deposit_methods')
        .update({
          ...depositFormData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDepositMethod.id);

      if (error) throw error;

      setDepositMethods(methods =>
        methods.map(method =>
          method.id === selectedDepositMethod.id
            ? { ...method, ...depositFormData }
            : method
        )
      );

      setIsDepositDialogOpen(false);
      setSelectedDepositMethod(null);
      toast({
        title: "Success",
        description: "Deposit method updated successfully",
      });
    } catch (error) {
      console.error('Error updating deposit method:', error);
      toast({
        title: "Error",
        description: "Failed to update deposit method",
        variant: "destructive"
      });
    }
  };

  const handleCreateNewDepositMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('deposit_methods')
        .insert([depositFormData])
        .select()
        .single();

      if (error) throw error;

      setDepositMethods(methods => [...methods, data]);
      setIsDepositDialogOpen(false);
      setSelectedDepositMethod(null);
      toast({
        title: "Success",
        description: "Deposit method created successfully",
      });
    } catch (error) {
      console.error('Error creating deposit method:', error);
      toast({
        title: "Error",
        description: "Failed to create deposit method",
        variant: "destructive"
      });
    }
  };

  const handleEditRank = (rank: Rank) => {
    setSelectedRank(rank);
    setRankFormData({
      title: rank.title,
      business_amount: rank.business_amount,
      bonus: rank.bonus
    });
    setIsRankDialogOpen(true);
  };

  const handleDeleteRank = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ranks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRanks(ranks.filter(rank => rank.id !== id));
      toast({
        title: "Success",
        description: "Rank deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting rank:', error);
      toast({
        title: "Error",
        description: "Failed to delete rank",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRank) return;

    try {
      const { error } = await supabase
        .from('ranks')
        .update(rankFormData)
        .eq('id', selectedRank.id);

      if (error) throw error;

      setRanks(ranks.map(rank =>
        rank.id === selectedRank.id
          ? { ...rank, ...rankFormData }
          : rank
      ));

      setIsRankDialogOpen(false);
      setSelectedRank(null);
      toast({
        title: "Success",
        description: "Rank updated successfully",
      });
    } catch (error) {
      console.error('Error updating rank:', error);
      toast({
        title: "Error",
        description: "Failed to update rank",
        variant: "destructive"
      });
    }
  };

  const handleCreateNewRank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('ranks')
        .insert([rankFormData])
        .select()
        .single();

      if (error) throw error;

      setRanks([...ranks, data]);
      setIsRankDialogOpen(false);
      toast({
        title: "Success",
        description: "Rank created successfully",
      });
    } catch (error) {
      console.error('Error creating rank:', error);
      toast({
        title: "Error",
        description: "Failed to create rank",
        variant: "destructive"
      });
    }
  };

  const activeBanners = banners.filter(banner => banner.status === 'active').length;

  return (
    <AdminLayout>
      <PageHeader 
        title="Promotions & Settings" 
        description="Manage promotional banners, commission levels, and deposit methods"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="banners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="banners">Promotional Banners</TabsTrigger>
          <TabsTrigger value="levels">Commission Levels</TabsTrigger>
          <TabsTrigger value="deposit-methods">Deposit Methods</TabsTrigger>
          <TabsTrigger value="ranks">Ranks</TabsTrigger>
        </TabsList>

        <TabsContent value="banners">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <StatCard
              title="Total Banners"
              value={banners.length.toString()}
              icon={<Image className="h-4 w-4" />}
            />
            <StatCard
              title="Active Banners"
              value={activeBanners.toString()}
              icon={<Image className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner) => (
              <Card key={banner.id}>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">{banner.title}</CardTitle>
                  <CardDescription>
                    Status: <span className={banner.status === 'active' ? 'text-green-500' : 'text-red-500'}>
                      {banner.status}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video relative rounded-md overflow-hidden">
                    <img 
                      src={banner.image_url} 
                      alt={banner.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(banner)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(banner.id)}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="levels">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>Level {level.level}</TableCell>
                    <TableCell>{level.percentage}%</TableCell>
                    <TableCell>{level.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditLevel(level)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="deposit-methods">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Deposit Methods</h2>
            <Button onClick={() => {
              setSelectedDepositMethod(null);
              setDepositFormData({
                method: 'crypto',
                crypto_name: '',
                crypto_symbol: '',
                network: '',
                logo_url: '',
                qr_code_url: '',
                deposit_address: '',
                is_active: true,
                min_amount: 0
              });
              setIsDepositDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Method
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Min. Amount</TableHead>
                  <TableHead>Logo URL</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Deposit Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium capitalize">{method.method}</TableCell>
                    <TableCell>
                      {method.crypto_name ? `${method.crypto_name} (${method.crypto_symbol})` : '-'}
                    </TableCell>
                    <TableCell>{method.network || '-'}</TableCell>
                    <TableCell>${method.min_amount}</TableCell>
                    <TableCell>
                      {method.logo_url ? (
                        <img 
                          src={method.logo_url} 
                          alt={method.crypto_name || ''} 
                          className="w-8 h-8"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {method.qr_code_url ? (
                        <img 
                          src={method.qr_code_url} 
                          alt="QR Code" 
                          className="w-8 h-8"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {method.deposit_address || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={method.is_active ? "success" : "secondary"}>
                        {method.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDepositMethod(method)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDepositMethod(method.id)}
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
        </TabsContent>

        <TabsContent value="ranks">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Rank System</h2>
            <Button onClick={() => {
              setSelectedRank(null);
              setRankFormData({
                title: "",
                business_amount: 0,
                bonus: 0
              });
              setIsRankDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rank
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank Name</TableHead>
                  <TableHead>Business Amount</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranks
                  .sort((a, b) => a.business_amount - b.business_amount)
                  .map((rank) => (
                    <TableRow key={rank.id}>
                      <TableCell>{rank.title}</TableCell>
                      <TableCell>${rank.business_amount.toLocaleString()}</TableCell>
                      <TableCell>${rank.bonus.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {rank.title !== "New Member" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRank(rank)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteRank(rank.id)}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingBanner(null);
            setFormData({ title: "", image_url: "", link: "", status: "active" });
          }
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add New Banner'}</DialogTitle>
            <DialogDescription>
              {editingBanner 
                ? 'Edit the promotional banner details' 
                : 'Create a new promotional banner to display on the dashboard'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter banner title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="Enter image URL"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="link">Link To</Label>
              <Select
                value={formData.link}
                onValueChange={(value) => setFormData({ ...formData, link: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoutes.map((route) => (
                    <SelectItem key={route.value} value={route.value}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="status">Active Status</Label>
              <Switch
                id="status"
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, status: checked ? 'active' : 'inactive' })
                }
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingBanner(null);
                  setFormData({ title: "", image_url: "", link: "", status: "active" });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingBanner ? 'Save Changes' : 'Create Banner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLevelsDialogOpen} onOpenChange={setIsLevelsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Commission Level</DialogTitle>
            <DialogDescription>
              Update the commission percentage and description for this level
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLevel} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                value={selectedLevel?.level || ''}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="percentage">Percentage</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                value={levelFormData.percentage}
                onChange={(e) => setLevelFormData({
                  ...levelFormData,
                  percentage: parseFloat(e.target.value)
                })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={levelFormData.description}
                onChange={(e) => setLevelFormData({
                  ...levelFormData,
                  description: e.target.value
                })}
                required
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsLevelsDialogOpen(false);
                  setSelectedLevel(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedDepositMethod ? 'Edit' : 'Add'} Deposit Method</DialogTitle>
            <DialogDescription>
              {selectedDepositMethod ? 'Update the deposit method details' : 'Create a new deposit method'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={selectedDepositMethod ? handleUpdateDepositMethod : handleCreateNewDepositMethod} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="method">Method</Label>
              <Select
                value={depositFormData.method}
                onValueChange={(value: 'bank_transfer' | 'crypto' | 'upi') => 
                  setDepositFormData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {depositFormData.method === 'crypto' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="crypto_name">Crypto Name</Label>
                    <Input
                      id="crypto_name"
                      value={depositFormData.crypto_name}
                      onChange={(e) => setDepositFormData(prev => ({ 
                        ...prev, 
                        crypto_name: e.target.value 
                      }))}
                      placeholder="e.g. Bitcoin"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="crypto_symbol">Symbol</Label>
                    <Input
                      id="crypto_symbol"
                      value={depositFormData.crypto_symbol}
                      onChange={(e) => setDepositFormData(prev => ({ 
                        ...prev, 
                        crypto_symbol: e.target.value 
                      }))}
                      placeholder="e.g. BTC"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="network">Network</Label>
                  <Input
                    id="network"
                    value={depositFormData.network}
                    onChange={(e) => setDepositFormData(prev => ({ 
                      ...prev, 
                      network: e.target.value 
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={depositFormData.logo_url}
                    onChange={(e) => setDepositFormData(prev => ({ 
                      ...prev, 
                      logo_url: e.target.value 
                    }))}
                    placeholder="Enter logo URL"
                  />
                  {depositFormData.logo_url && (
                    <div className="mt-2">
                      <img 
                        src={depositFormData.logo_url} 
                        alt="Logo Preview" 
                        className="w-10 h-10 rounded"
                      />
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="qr_code_url">QR Code URL</Label>
                  <Input
                    id="qr_code_url"
                    value={depositFormData.qr_code_url}
                    onChange={(e) => setDepositFormData(prev => ({ 
                      ...prev, 
                      qr_code_url: e.target.value 
                    }))}
                    placeholder="Enter QR code URL"
                  />
                  {depositFormData.qr_code_url && (
                    <div className="mt-2">
                      <img 
                        src={depositFormData.qr_code_url} 
                        alt="QR Code Preview" 
                        className="w-24 h-24"
                      />
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deposit_address">Deposit Address</Label>
                  <Input
                    id="deposit_address"
                    value={depositFormData.deposit_address}
                    onChange={(e) => setDepositFormData(prev => ({ 
                      ...prev, 
                      deposit_address: e.target.value 
                    }))}
                    placeholder="Enter deposit address"
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="min_amount">Minimum Amount</Label>
              <Input
                id="min_amount"
                type="number"
                value={depositFormData.min_amount}
                onChange={(e) => setDepositFormData(prev => ({ 
                  ...prev, 
                  min_amount: parseFloat(e.target.value) 
                }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="is_active">Active Status</Label>
              <Switch
                id="is_active"
                checked={depositFormData.is_active}
                onCheckedChange={(checked) => setDepositFormData(prev => ({ 
                  ...prev, 
                  is_active: checked 
                }))}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsDepositDialogOpen(false);
                  setSelectedDepositMethod(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedDepositMethod ? 'Save Changes' : 'Create Method'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRankDialogOpen} onOpenChange={setIsRankDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedRank ? 'Edit Rank' : 'Add New Rank'}</DialogTitle>
            <DialogDescription>
              {selectedRank ? 'Update the rank details and requirements' : 'Create a new rank level'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={selectedRank ? handleUpdateRank : handleCreateNewRank} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Rank Name</Label>
              <Input
                id="title"
                value={rankFormData.title}
                onChange={(e) => setRankFormData({
                  ...rankFormData,
                  title: e.target.value
                })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="business_amount">Business Amount</Label>
              <Input
                id="business_amount"
                type="number"
                value={rankFormData.business_amount}
                onChange={(e) => setRankFormData({
                  ...rankFormData,
                  business_amount: parseFloat(e.target.value)
                })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bonus">Bonus</Label>
              <Input
                id="bonus"
                type="number"
                value={rankFormData.bonus}
                onChange={(e) => setRankFormData({
                  ...rankFormData,
                  bonus: parseFloat(e.target.value)
                })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                {selectedRank ? 'Save Changes' : 'Create Rank'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default PromotionsPage;
