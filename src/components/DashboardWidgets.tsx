
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const activityData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 700 },
  { name: 'Jun', value: 900 },
  { name: 'Jul', value: 1100 },
];

const DashboardWidgets = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const copyReferralLink = () => {
    if (profile?.referral_code) {
      const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied to clipboard",
        description: "Referral link has been copied to clipboard.",
      });
    }
  };
  
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
      <Card className="lg:col-span-4 glass card-hover">
        <CardHeader>
          <CardTitle>Investment Activity</CardTitle>
          <CardDescription>Your investment activity over time</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activityData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-3 glass card-hover">
        <CardHeader>
          <CardTitle>Your Affiliate Link</CardTitle>
          <CardDescription>Share this link to earn commission</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-muted p-3 font-mono text-sm">
              {window.location.origin}/?ref={profile?.referral_code || ''}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyReferralLink} className="gap-1 flex-1">
                <Copy className="h-4 w-4" />
                <span>Copy Link</span>
              </Button>
              <Button variant="outline" className="gap-1">
                <ExternalLink className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Earn 10% commission on all referrals.
        </CardFooter>
      </Card>
    </div>
  );
};

export default DashboardWidgets;
