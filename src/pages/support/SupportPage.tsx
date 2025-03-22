import { useState, useEffect } from "react";
import { AlertCircle, Clock, CheckCircle, XCircle, SendHorizontal, Phone, MessageCircle } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { checkRateLimit } from "@/lib/rateLimit";

const supportIssues = [
  { value: "deposit", label: "Deposit Issues" },
  { value: "withdrawal", label: "Withdrawal Problems" },
  { value: "investment", label: "Investment Concerns" },
  { value: "account", label: "Account Access" },
  { value: "kyc", label: "KYC Verification" },
  { value: "commission", label: "Commission Questions" },
  { value: "other", label: "Other Issues" }
];

interface SupportMessage {
  id: string;
  message: string;
  sender_type: 'user' | 'admin';
  created_at: string;
}

const SupportPage = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Record<string, SupportMessage[]>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, ai_response')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check rate limit: 3 tickets per hour
      if (!checkRateLimit(`ticket_${user.id}`, 3, 3600)) {
        toast({
          title: "Rate Limited",
          description: "Please wait before submitting another ticket. Maximum 3 tickets per hour.",
          variant: "destructive"
        });
        return;
      }

      // Check rate limit: 10 tickets per day
      if (!checkRateLimit(`ticket_daily_${user.id}`, 10, 86400)) {
        toast({
          title: "Daily Limit Reached",
          description: "You have reached the maximum number of tickets for today. Please try again tomorrow.",
          variant: "destructive"
        });
        return;
      }

      if (!issueType || !description.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in all fields",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);

      const { error } = await supabase
        .from('support_tickets')
        .insert([{
          user_id: user.id,
          issue_type: issueType,
          description: description,
          status: 'Pending'
        }]);

      if (error) throw error;

      toast({
        title: "Ticket Submitted",
        description: "Our AI system will analyze your issue and respond shortly."
      });

      setIssueType("");
      setDescription("");
      fetchTickets();
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to submit support ticket",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (ticketId: string) => {
    if (!newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check rate limit: 10 messages per minute
      if (!checkRateLimit(`message_${user.id}`, 10, 60)) {
        toast({
          title: "Rate Limited",
          description: "Please wait a moment before sending more messages.",
          variant: "destructive"
        });
        return;
      }

      const { error: messageError } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          message: newMessage,
          sender_type: 'user'
        }]);

      if (messageError) throw messageError;

      const { error: statusError } = await supabase
        .from('support_tickets')
        .update({ status: 'Pending' })
        .eq('id', ticketId);

      if (statusError) throw statusError;

      setNewMessage("");
      setIsDialogOpen(false);
      fetchTickets();
      fetchMessages(ticketId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const ActiveTicketContent = ({ ticket }: { ticket: any }) => (
    <div key={ticket.id} className="flex flex-col p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-medium">{supportIssues.find(i => i.value === ticket.issue_type)?.label}</p>
          <p className="text-sm text-muted-foreground">{ticket.description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedTicket(ticket);
            setIsDialogOpen(true);
            fetchMessages(ticket.id);
          }}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Reply
        </Button>
      </div>
      
      <div className="mt-4 space-y-3">
        {messages[ticket.id]?.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg ${
              msg.sender_type === 'admin' 
                ? 'bg-blue-50 ml-4' 
                : 'bg-gray-50 mr-4'
            }`}
          >
            <p className="text-sm">{msg.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(msg.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ShellLayout>
      <PageHeader
        title="Support Center"
        description="Get help with your account and investments"
      />

      <div className="space-y-6">
        {/* New Ticket Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit New Support Ticket</CardTitle>
            <CardDescription>
              Describe your issue and our AI system will help resolve it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {supportIssues.map(issue => (
                    <SelectItem key={issue.value} value={issue.value}>
                      {issue.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Describe your issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-600">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Support Information</p>
                    <p>All tickets will be initially processed by our AI system for quick resolution. If your issue remains unresolved after 48 hours, our support team will contact you directly.</p>
                    <p className="mt-2">Please ensure your phone number is updated in your Profile section.</p>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
                <SendHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="active" className="relative">
                  Active
                  {tickets.filter(ticket => ticket.status === 'Active').length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {tickets.filter(ticket => ticket.status === 'Active').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 mt-4">
                {tickets
                  .filter(ticket => ticket.status === 'Pending')
                  .map(ticket => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{supportIssues.find(i => i.value === ticket.issue_type)?.label}</p>
                        <p className="text-sm text-muted-foreground">{ticket.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-500" />
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="active" className="space-y-4 mt-4">
                {tickets
                  .filter(ticket => ticket.status === 'Active')
                  .map(ticket => (
                    <ActiveTicketContent key={ticket.id} ticket={ticket} />
                  ))}
              </TabsContent>

              <TabsContent value="closed" className="space-y-4 mt-4">
                {tickets
                  .filter(ticket => ticket.status === 'Closed')
                  .map(ticket => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{supportIssues.find(i => i.value === ticket.issue_type)?.label}</p>
                        <p className="text-sm text-muted-foreground">{ticket.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to AI Support</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto space-y-3">
              {messages[selectedTicket?.id]?.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg ${
                    msg.sender_type === 'admin' 
                      ? 'bg-blue-50 ml-4' 
                      : 'bg-gray-50 mr-4'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
              />
              <Button onClick={() => handleSendMessage(selectedTicket?.id)}>
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
};

export default SupportPage;
