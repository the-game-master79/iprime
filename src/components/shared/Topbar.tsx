import { ArrowLeft, Bell, Info, AlertCircle, CheckCircle } from "lucide-react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface TopbarProps {
  title: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'admin' | 'system' | 'referral';
  is_active: boolean;
  read_at: string | null;
  created_at: string;
  user_id: string | null;
}

export const Topbar = ({ title }: TopbarProps) => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUserBalance();
    fetchNotices();
  }, []);

  const fetchUserBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setBalance(data?.withdrawal_wallet || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchNotices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .or(`category.eq.admin,and(user_id.eq.${user.id},category.in.(referral,system))`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
      setUnreadCount(data?.filter(n => 
        (n.category === 'admin' && n.is_active) || 
        ((n.category === 'referral' || n.category === 'system') && !n.read_at)
      ).length || 0);
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
        .update({ is_active: false })
        .eq('category', 'admin');

      await supabase
        .from('notices')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('category', ['referral', 'system'])
        .is('read_at', null);

      fetchNotices();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNoticeIcon = (type: Notice['type']) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const handleBalanceClick = () => {
    navigate('/deposit');
  };

  return (
    <header className="flex items-center justify-between py-4 mt-4">
      <div className="container max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-4">
            <div 
              onClick={handleBalanceClick}
              className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full cursor-pointer hover:bg-primary/20 transition-colors"
            >
              <span className="text-sm font-medium">
                ${balance.toLocaleString()}
              </span>
              <Plus className="h-4 w-4 p-0.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px]">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <span className="font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={handleMarkAllAsRead}>
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="py-2 max-h-[400px] overflow-auto">
                  {notices.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-muted-foreground text-center">
                      No notifications
                    </div>
                  ) : (
                    notices.map((notice) => (
                      <div 
                        key={notice.id} 
                        className={`px-4 py-3 hover:bg-muted flex items-start gap-3 ${
                          ((notice.category === 'admin' && notice.is_active) || 
                           ((notice.category === 'referral' || notice.category === 'system') && !notice.read_at)) 
                            ? 'bg-muted/50' : ''
                        }`}
                      >
                        {getNoticeIcon(notice.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notice.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{notice.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notice.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      </div>
    </header>
  );
};
