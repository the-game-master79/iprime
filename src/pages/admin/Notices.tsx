import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import ShellLayout from "@/components/layout/Shell";
import { PageTransition, PageHeader } from "@/components/ui-components";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_active: boolean;
  created_at: string;
}

const NoticesAdmin = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<Notice["type"]>("info");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('category', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch notices",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('notices')
        .insert([{ title, content, type, is_active: true }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notice created successfully",
      });

      setTitle("");
      setContent("");
      setType("info");
      fetchNotices();
    } catch (error) {
      console.error('Error creating notice:', error);
      toast({
        title: "Error",
        description: "Failed to create notice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNotice) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', selectedNotice);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notice deleted successfully",
      });

      fetchNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast({
        title: "Error",
        description: "Failed to delete notice",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedNotice(null);
    }
  };

  return (
    <ShellLayout>
      <PageTransition>
        <div className="space-y-6">
          <PageHeader
            title="Notice Board Management"
            description="Create and manage notices for users"
          />

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Notice Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Textarea
                  placeholder="Notice Content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
                <Select
                  value={type}
                  onValueChange={(value: Notice["type"]) => setType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notice type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Notice"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {notices.map((notice) => (
              <Card key={notice.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{notice.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{notice.content}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          notice.type === 'info' ? 'bg-blue-100 text-blue-800' :
                          notice.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          notice.type === 'success' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {notice.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notice.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedNotice(notice.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the notice.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageTransition>
    </ShellLayout>
  );
};

export default NoticesAdmin;
