
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  DollarSign, 
  Search, 
  FileText, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Download,
  Filter
} from "lucide-react";
import { PageHeader } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";

// Mock data
const withdrawalRequests = [
  { 
    id: "WD-1001", 
    user: "John Smith", 
    userId: "U-567",
    email: "john@example.com",
    date: "2023-07-15", 
    amount: 500, 
    method: "Bank Transfer", 
    status: "pending",
    accountInfo: "Bank of America - ****4567" 
  },
  { 
    id: "WD-1002", 
    user: "Sarah Johnson", 
    userId: "U-321",
    email: "sarah@example.com",
    date: "2023-07-16", 
    amount: 1200, 
    method: "Bitcoin", 
    status: "pending",
    accountInfo: "Wallet: 3FZbgi29..." 
  },
  { 
    id: "WD-1003", 
    user: "Michael Brown", 
    userId: "U-876",
    email: "michael@example.com",
    date: "2023-07-14", 
    amount: 750, 
    method: "PayPal", 
    status: "approved",
    accountInfo: "michael@example.com" 
  },
  { 
    id: "WD-1004", 
    user: "Emily Wilson", 
    userId: "U-432",
    email: "emily@example.com",
    date: "2023-07-13", 
    amount: 300, 
    method: "Bank Transfer", 
    status: "completed",
    accountInfo: "Chase Bank - ****7890" 
  },
  { 
    id: "WD-1005", 
    user: "David Lee", 
    userId: "U-654",
    email: "david@example.com",
    date: "2023-07-12", 
    amount: 1500, 
    method: "Bitcoin", 
    status: "rejected",
    accountInfo: "Wallet: 1Drg5B7..." 
  },
];

const AdminWithdrawals = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<typeof withdrawalRequests[0] | null>(null);
  
  const filteredWithdrawals = withdrawalRequests.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      withdrawal.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || withdrawal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const handleApprove = (id: string) => {
    toast({
      title: "Withdrawal Approved",
      description: `Withdrawal ${id} has been approved and queued for processing.`,
    });
  };
  
  const handleReject = (id: string) => {
    toast({
      title: "Withdrawal Rejected",
      description: `Withdrawal ${id} has been rejected and the user has been notified.`,
    });
  };
  
  const handleExport = () => {
    toast({
      title: "Report Generated",
      description: "The withdrawal report has been exported to CSV.",
    });
  };
  
  return (
    <AdminLayout>
      <PageHeader 
        title="Withdrawal Management" 
        description="Process and track user withdrawal requests"
        action={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        }
      />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>Review and process pending withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or user..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="status-filter" className="sr-only">
                Filter by Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">{withdrawal.id}</TableCell>
                    <TableCell>{withdrawal.user}</TableCell>
                    <TableCell>{withdrawal.date}</TableCell>
                    <TableCell>${withdrawal.amount.toLocaleString()}</TableCell>
                    <TableCell>{withdrawal.method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          withdrawal.status === "completed" ? "default" :
                          withdrawal.status === "approved" ? "success" :
                          withdrawal.status === "pending" ? "warning" :
                          "destructive"
                        }
                      >
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedWithdrawal(withdrawal)}
                            >
                              <FileText className="mr-1 h-4 w-4" />
                              Details
                            </Button>
                          </DialogTrigger>
                          {selectedWithdrawal && (
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Withdrawal Details</DialogTitle>
                                <DialogDescription>
                                  Complete information about this withdrawal request
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Withdrawal ID</Label>
                                    <p className="font-medium">{selectedWithdrawal.id}</p>
                                  </div>
                                  <div>
                                    <Label>Date Requested</Label>
                                    <p>{selectedWithdrawal.date}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>User ID</Label>
                                    <p>{selectedWithdrawal.userId}</p>
                                  </div>
                                  <div>
                                    <Label>User Name</Label>
                                    <p>{selectedWithdrawal.user}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <p>{selectedWithdrawal.email}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Amount</Label>
                                    <p className="text-lg font-bold">
                                      ${selectedWithdrawal.amount.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Method</Label>
                                    <p>{selectedWithdrawal.method}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label>Account Information</Label>
                                  <p>{selectedWithdrawal.accountInfo}</p>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Badge
                                    variant={
                                      selectedWithdrawal.status === "completed" ? "default" :
                                      selectedWithdrawal.status === "approved" ? "success" :
                                      selectedWithdrawal.status === "pending" ? "warning" :
                                      "destructive"
                                    }
                                    className="mt-1"
                                  >
                                    {selectedWithdrawal.status.charAt(0).toUpperCase() + selectedWithdrawal.status.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                              <DialogFooter>
                                {selectedWithdrawal.status === "pending" && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      className="gap-2"
                                      onClick={() => handleReject(selectedWithdrawal.id)}
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Reject
                                    </Button>
                                    <Button 
                                      className="gap-2"
                                      onClick={() => handleApprove(selectedWithdrawal.id)}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Approve
                                    </Button>
                                  </>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>
                        
                        {withdrawal.status === "pending" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500"
                              onClick={() => handleReject(withdrawal.id)}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-500"
                              onClick={() => handleApprove(withdrawal.id)}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredWithdrawals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No withdrawal requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Statistics</CardTitle>
            <CardDescription>Summary of recent withdrawal activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Amount</p>
                    <p className="text-2xl font-bold">
                      ${withdrawalRequests
                        .filter(w => w.status === "pending")
                        .reduce((sum, w) => sum + w.amount, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Requests</p>
                    <p className="text-2xl font-bold">
                      {withdrawalRequests.filter(w => w.status === "pending").length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="mb-4 font-medium">Recent Activity</h4>
              <div className="space-y-4">
                {withdrawalRequests
                  .slice(0, 3)
                  .map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className={`rounded-full p-2 
                        ${withdrawal.status === "completed" ? "bg-green-100 text-green-500" : 
                          withdrawal.status === "approved" ? "bg-blue-100 text-blue-500" :
                          withdrawal.status === "pending" ? "bg-yellow-100 text-yellow-500" :
                          "bg-red-100 text-red-500"}`}
                      >
                        {withdrawal.status === "completed" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : withdrawal.status === "approved" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : withdrawal.status === "pending" ? (
                          <DollarSign className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{withdrawal.user}</p>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.status === "completed" ? "Withdrawal completed" :
                            withdrawal.status === "approved" ? "Withdrawal approved" :
                            withdrawal.status === "pending" ? "Requested withdrawal" :
                            "Withdrawal rejected"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${withdrawal.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{withdrawal.date}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Processing Guidelines</CardTitle>
            <CardDescription>Standard procedures for handling withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-medium">Verification Requirements</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Confirm user identity and account ownership</li>
                  <li>Ensure KYC documentation is complete and up-to-date</li>
                  <li>Verify that withdrawal amount does not exceed available balance</li>
                  <li>Check for any suspicious account activity or security alerts</li>
                </ul>
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-medium">Processing Timeframes</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Bank Transfers: 1-3 business days</li>
                  <li>PayPal: 24 hours</li>
                  <li>Cryptocurrency: 24-48 hours</li>
                  <li>All requests must be processed within 24 hours of submission</li>
                </ul>
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-medium">Rejection Protocols</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Always provide clear reason for rejection</li>
                  <li>Suggest alternative withdrawal methods when applicable</li>
                  <li>Document all rejections with supporting evidence</li>
                  <li>Offer customer support contact for resolution</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminWithdrawals;
