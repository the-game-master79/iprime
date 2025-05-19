import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, UserCircle, Sun, Moon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/use-theme";

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  amount?: number; // Add optional amount field
}

export const DashboardTopbar = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notices')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);

      fetchNotices();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  return (
    <header className="flex items-center justify-between py-4 bg-secondary">
      <div className="container mx-auto max-w-[1000px] px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={
                theme === "dark"
                  ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-dark.svg"
                  : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-light.svg"
              }
              alt="CloudForex" 
              className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.location.reload()}
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme toggle button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-secondary-foreground hover:bg-secondary-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-400" weight="bold" />
              ) : (
                <Moon className="h-5 w-5 text-blue-500" weight="bold" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-xl relative bg-secondary-foreground hover:bg-secondary-foreground"
                >
                  <Bell className="h-5 w-5 text-foreground" weight="bold" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px] bg-card text-card-foreground border-border">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <DropdownMenuLabel className="text-foreground">Notifications</DropdownMenuLabel>
                  {notices.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs hover:text-primary"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-auto">
                  {notices.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      No notifications
                    </div>
                  ) : (
                    notices.map((notice) => (
                      <DropdownMenuItem key={notice.id} className="px-4 py-3 cursor-default hover:bg-accent">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{notice.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {notice.content.replace(
                              /\$?([\d,.]+)(\.\d+)?/g,
                              (match, whole, decimal) => {
                                const num = parseFloat(match.replace(/[$,]/g, ''));
                                return isNaN(num) ? match : `$${num.toFixed(2)}`;
                              }
                            )}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-lg bg-secondary hover:bg-secondary-foreground"
              onClick={() => navigate('/profile')}
            >
              <Avatar className="h-10 w-10 bg-primary hover:bg-primary/90 rounded-lg transition-colors">
                <AvatarFallback className="bg-primary rounded-lg">
                  <UserCircle weight="bold" className="h-6 w-6 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
