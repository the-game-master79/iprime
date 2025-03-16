
import React, { useState } from "react";
import { Save, Shield, Users, DollarSign, Bell, Mail } from "lucide-react";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PageHeader
} from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
  
  // General settings
  const [siteName, setSiteName] = useState("GrowthVest Admin");
  const [supportEmail, setSupportEmail] = useState("support@growthvest.com");
  const [maintenance, setMaintenance] = useState(false);
  
  // Security settings
  const [twoFactorRequired, setTwoFactorRequired] = useState(true);
  const [passwordExpiry, setPasswordExpiry] = useState("90");
  const [loginAttempts, setLoginAttempts] = useState("5");
  
  // User settings
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [allowUserDeletion, setAllowUserDeletion] = useState(false);
  
  // Payment settings
  const [minimumWithdrawal, setMinimumWithdrawal] = useState("100");
  const [withdrawalFee, setWithdrawalFee] = useState("2.5");
  const [paymentGateway, setPaymentGateway] = useState("stripe");
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [adminAlerts, setAdminAlerts] = useState(true);
  const [userActivityAlerts, setUserActivityAlerts] = useState(true);
  
  const handleSaveGeneral = () => {
    toast({
      title: "Settings Saved",
      description: "General settings have been updated successfully.",
    });
  };
  
  const handleSaveSecurity = () => {
    toast({
      title: "Settings Saved",
      description: "Security settings have been updated successfully.",
    });
  };
  
  const handleSaveUser = () => {
    toast({
      title: "Settings Saved",
      description: "User settings have been updated successfully.",
    });
  };
  
  const handleSavePayment = () => {
    toast({
      title: "Settings Saved",
      description: "Payment settings have been updated successfully.",
    });
  };
  
  const handleSaveNotification = () => {
    toast({
      title: "Settings Saved",
      description: "Notification settings have been updated successfully.",
    });
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="System Settings" 
        description="Configure system settings and preferences"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="general" className="flex-1 gap-2">
            <Shield className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1 gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="user" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            User
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex-1 gap-2">
            <DollarSign className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="notification" className="flex-1 gap-2">
            <Bell className="h-4 w-4" />
            Notification
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">General Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure general platform settings
              </p>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="site-name" className="text-sm font-medium">
                    Site Name
                  </label>
                  <Input
                    id="site-name"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="support-email" className="text-sm font-medium">
                    Support Email
                  </label>
                  <Input
                    id="support-email"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="maintenance-mode" className="text-sm font-medium">
                      Maintenance Mode
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Put the site in maintenance mode
                    </p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={maintenance}
                    onCheckedChange={setMaintenance}
                  />
                </div>
                
                <Button className="gap-2" onClick={handleSaveGeneral}>
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Security Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure security and access control settings
              </p>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="two-factor" className="text-sm font-medium">
                      Require Two-Factor Authentication
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Require 2FA for all admin accounts
                    </p>
                  </div>
                  <Switch
                    id="two-factor"
                    checked={twoFactorRequired}
                    onCheckedChange={setTwoFactorRequired}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="password-expiry" className="text-sm font-medium">
                    Password Expiry (days)
                  </label>
                  <Input
                    id="password-expiry"
                    type="number"
                    value={passwordExpiry}
                    onChange={(e) => setPasswordExpiry(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="login-attempts" className="text-sm font-medium">
                    Maximum Login Attempts
                  </label>
                  <Input
                    id="login-attempts"
                    type="number"
                    value={loginAttempts}
                    onChange={(e) => setLoginAttempts(e.target.value)}
                  />
                </div>
                
                <Button className="gap-2" onClick={handleSaveSecurity}>
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* User Settings */}
        <TabsContent value="user">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">User Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure user registration and management settings
              </p>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="allow-registration" className="text-sm font-medium">
                      Allow User Registration
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Enable or disable new user registration
                    </p>
                  </div>
                  <Switch
                    id="allow-registration"
                    checked={allowRegistration}
                    onCheckedChange={setAllowRegistration}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="email-verification" className="text-sm font-medium">
                      Require Email Verification
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Require email verification for new accounts
                    </p>
                  </div>
                  <Switch
                    id="email-verification"
                    checked={requireEmailVerification}
                    onCheckedChange={setRequireEmailVerification}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="user-deletion" className="text-sm font-medium">
                      Allow User Self-Deletion
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Allow users to delete their own accounts
                    </p>
                  </div>
                  <Switch
                    id="user-deletion"
                    checked={allowUserDeletion}
                    onCheckedChange={setAllowUserDeletion}
                  />
                </div>
                
                <Button className="gap-2" onClick={handleSaveUser}>
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Payment Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure payment and transaction settings
              </p>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="min-withdrawal" className="text-sm font-medium">
                    Minimum Withdrawal Amount ($)
                  </label>
                  <Input
                    id="min-withdrawal"
                    type="number"
                    value={minimumWithdrawal}
                    onChange={(e) => setMinimumWithdrawal(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="withdrawal-fee" className="text-sm font-medium">
                    Withdrawal Fee (%)
                  </label>
                  <Input
                    id="withdrawal-fee"
                    type="number"
                    value={withdrawalFee}
                    onChange={(e) => setWithdrawalFee(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="payment-gateway" className="text-sm font-medium">
                    Default Payment Gateway
                  </label>
                  <select
                    id="payment-gateway"
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="coinbase">Coinbase</option>
                  </select>
                </div>
                
                <Button className="gap-2" onClick={handleSavePayment}>
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notification">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure system notifications and alerts
              </p>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="email-notifications" className="text-sm font-medium">
                      Email Notifications
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Send system notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="admin-alerts" className="text-sm font-medium">
                      Admin Alerts
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Receive alerts for important admin events
                    </p>
                  </div>
                  <Switch
                    id="admin-alerts"
                    checked={adminAlerts}
                    onCheckedChange={setAdminAlerts}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="user-activity" className="text-sm font-medium">
                      User Activity Alerts
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Receive alerts for suspicious user activity
                    </p>
                  </div>
                  <Switch
                    id="user-activity"
                    checked={userActivityAlerts}
                    onCheckedChange={setUserActivityAlerts}
                  />
                </div>
                
                <Button className="gap-2" onClick={handleSaveNotification}>
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default SettingsPage;
