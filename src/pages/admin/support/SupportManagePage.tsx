import { useState, useEffect } from "react";
import { MessageCircle, CheckCircle, XCircle, Search } from "lucide-react";
import AdminLayout from "../AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { PageHeader, StatCard } from "@/components/ui-components";

interface SupportMessage {
  id: string;
  message: string;
  sender_type: 'user' | 'admin';
  created_at: string;
}

interface SupportTicket {
  id: string;
  user_id: string;
  issue_type: string;
  description: string;
  status: 'Pending' | 'Active' | 'Closed';
  ai_response?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const SupportManagePage = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Record<string, SupportMessage[]>>({});

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive"
      });
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(prev => ({ ...prev, [ticketId]: data }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleProcess = async () => {
    if (!selectedTicket || !response.trim()) return;

    try {
      setIsProcessing(true);
      
      // Insert admin message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: selectedTicket.id,
          message: response,
          sender_type: 'admin'
        }]);

      if (messageError) throw messageError;

      // Update ticket status
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .update({
          status: 'Active',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      if (ticketError) throw ticketError;

      toast({
        title: "Success",
        description: "Response sent successfully",
      });

      setIsDialogOpen(false);
      setResponse("");
      fetchTickets();
    } catch (error) {
      console.error('Error processing ticket:', error);
      toast({
        title: "Error",
        description: "Failed to process ticket",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'Closed',
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket has been closed",
      });

      fetchTickets();
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive"
      });
    }
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
    fetchMessages(ticket.id);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = (
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${ticket.profiles?.full_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = 
      statusFilter === "all" || 
      (ticket.status?.toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'Pending').length,
    active: tickets.filter(t => t.status === 'Active').length,
    closed: tickets.filter(t => t.status === 'Closed').length,
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Support Management" 
        description="Manage and respond to user support tickets"
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Tickets"
          value={stats.total}
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Closed"
          value={stats.closed}
          icon={<XCircle className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tickets found.
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {ticket.profiles?.full_name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${ticket.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {ticket.issue_type}
                    </p>
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                    {ticket.ai_response && (
                      <p className="text-sm text-blue-600 mt-1">
                        Response: {ticket.ai_response}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {ticket.status === 'Pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        Process
                      </Button>
                    )}
                    {ticket.status === 'Active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClose(ticket.id)}
                      >
                        Close Ticket
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Ticket Information</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Issue Type:</span> {selectedTicket?.issue_type}</p>
                <p><span className="font-medium">Description:</span> {selectedTicket?.description}</p>
                <p><span className="font-medium">User:</span> {selectedTicket?.profiles?.full_name}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="mb-4">
                <h4 className="font-medium mb-2">Conversation History</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-3">
                  {messages[selectedTicket?.id]?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.sender_type === 'admin' 
                          ? 'bg-blue-50 ml-4 border-blue-100 border' 
                          : 'bg-gray-50 mr-4 border-gray-100 border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium">
                          {msg.sender_type === 'admin' ? 'Support Team' : 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">New Response</h4>
                <Textarea
                  placeholder="Enter your response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcess} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Send Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SupportManagePage;
