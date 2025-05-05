// UI Components from @/components/ui/*
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CircleDollarSign, CheckCircle2, Clock, XCircle, Palette, TrendingUp, Users, Wallet, AlertTriangle, Check, Shield, Lock } from "lucide-react";
import { BalanceCards } from "@/components/shared/BalanceCards";
import { DashboardTopbar } from "@/components/shared/DashboardTopbar";
import { Topbar } from "@/components/shared/Topbar";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { AmountCard } from "@/components/shared/AmountCard";
import { KycVariant } from "@/components/shared/KycVariants";
import { Progress } from "@/components/ui/progress";

const DesignSystem = () => {
  // Colors from @/index.css CSS variables
  const colors = {
    // Base colors
    background: "hsl(var(--background))", // Dark background
    foreground: "hsl(var(--foreground))",

    // Card colors
    card: {
      DEFAULT: "hsl(var(--card))", // #141414
      foreground: "hsl(var(--card-foreground))" // Pure white
    },

    // Semantic colors
    primary: {
      DEFAULT: "hsl(var(--primary))",
      foreground: "hsl(var(--primary-foreground))"
    },
    secondary: {
      DEFAULT: "hsl(var(--secondary))",
      foreground: "hsl(var(--secondary-foreground))"
    },
    accent: {
      DEFAULT: "hsl(var(--accent))",
      foreground: "hsl(var(--accent-foreground))"
    },
    destructive: {
      DEFAULT: "hsl(var(--destructive))",
      foreground: "hsl(var(--destructive-foreground))"
    },
    muted: {
      DEFAULT: "hsl(var(--muted))",
      foreground: "hsl(var(--muted-foreground))"
    },
    popover: {
      DEFAULT: "hsl(var(--popover))",
      foreground: "hsl(var(--popover-foreground))"
    },

    // Form colors
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",

    // Badge colors
    badge: {
      success: {
        background: "hsl(var(--badge-success-bg))",
        text: "hsl(var(--badge-success-text))"
      },
      warning: {
        background: "hsl(var(--badge-warning-bg))",
        text: "hsl(var(--badge-warning-text))"
      },
      pending: {
        background: "hsl(var(--badge-pending-bg))",
        text: "hsl(var(--badge-pending-text))"
      }
    }
  };

  // Sample transactions data
  const sampleTransactions = [
    {
      id: "tx1",
      type: "deposit",
      amount: 1000.00,
      status: "Completed",
      created_at: new Date().toISOString(),
      description: "Sample deposit"
    },
    {
      id: "tx2", 
      type: "withdrawal",
      amount: 500.00,
      status: "Pending",
      created_at: new Date().toISOString(),
      description: "Sample withdrawal"
    },
    {
      id: "tx3",
      type: "withdrawal",
      amount: 750.00,
      status: "Failed",
      created_at: new Date().toISOString(),
      description: "Failed withdrawal"
    }
  ];

  // Sample amounts for cards
  const sampleAmounts = {
    available: 2500.00,
    invested: 5000.00,
    earnings: 750.00,
    affiliates: 300.00
  };

  return (
    <div className="container max-w-[1200px] mx-auto p-6 space-y-12 bg-background text-foreground">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-8 w-8" />
          <h1 className="text-4xl font-bold" id="page-title">Design System</h1>
        </div>
        <p className="text-muted-foreground text-lg">A collection of components and styles used across the application.</p>
      </div>

      {/* Add skip navigation for keyboard users */}
      <nav className="sr-only focus-within:not-sr-only">
        <ul className="fixed top-4 left-4 z-50 space-y-2">
          <li>
            <a href="#colors" className="bg-primary text-white px-4 py-2 rounded-lg">Skip to Colors</a>
          </li>
          <li>
            <a href="#typography" className="bg-primary text-white px-4 py-2 rounded-lg">Skip to Typography</a>
          </li>
          <li>
            <a href="#buttons" className="bg-primary text-white px-4 py-2 rounded-lg">Skip to Buttons</a>
          </li>
          <li>
            <a href="#form-controls" className="bg-primary text-white px-4 py-2 rounded-lg">Skip to Form Controls</a>
          </li>
        </ul>
      </nav>

      {/* Colors */}
      <section className="space-y-4" aria-labelledby="colors-title">
        <h2 className="text-2xl font-semibold" id="colors">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(colors).map(([name, value]) => (
            typeof value === 'string' ? (
              <Card key={name} className="p-4 bg-card text-card-foreground border-border/10">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: value }} />
                  <div>
                    <p className="font-medium capitalize">{name}</p>
                    <p className="text-sm text-muted-foreground">{value}</p>
                  </div>
                </div>
              </Card>
            ) : null
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4" aria-labelledby="typography-title">
        <h2 className="text-2xl font-semibold" id="typography">Typography</h2>
        <Card className="p-6 space-y-4 bg-card text-card-foreground border-border/10">
          <div>
            <h1 className="text-4xl font-bold">Heading 1</h1>
            <p className="text-sm text-muted-foreground">text-4xl font-bold</p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Heading 2</h2>
            <p className="text-sm text-muted-foreground">text-3xl font-semibold</p>
          </div>
          <div>
            <h3 className="text-2xl font-medium">Heading 3</h3>
            <p className="text-sm text-muted-foreground">text-2xl font-medium</p>
          </div>
          <div>
            <p className="text-base">Base Text</p>
            <p className="text-sm text-muted-foreground">text-base</p>
          </div>
          <div>
            <p className="text-sm">Small Text</p>
            <p className="text-sm text-muted-foreground">text-sm</p>
          </div>
        </Card>
      </section>

      {/* Buttons */}
      <section className="space-y-4" aria-labelledby="buttons-title">
        <h2 className="text-2xl font-semibold" id="buttons">Buttons</h2>
        <Card className="p-6 bg-card text-card-foreground border-border/10">
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </Card>
      </section>

      {/* Form Controls */}
      <section className="space-y-4" aria-labelledby="form-controls-title">
        <h2 className="text-2xl font-semibold" id="form-controls">Form Controls</h2>
        <Card className="p-6 space-y-6 bg-card text-card-foreground border-border/10">
          <div className="space-y-2">
            <Label>Input</Label>
            <Input placeholder="Enter text..." />
          </div>

          <div className="space-y-2">
            <Label>Select</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Option 1</SelectItem>
                <SelectItem value="2">Option 2</SelectItem>
                <SelectItem value="3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="checkbox" />
              <Label htmlFor="checkbox">Checkbox</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="switch" />
              <Label htmlFor="switch">Switch</Label>
            </div>
          </div>
        </Card>
      </section>

      {/* Badges */}
      <section className="space-y-4" aria-labelledby="badges-title">
        <h2 className="text-2xl font-semibold" id="badges">Badges</h2>
        <Card className="p-6 bg-card text-card-foreground border-border/10">
          <div className="flex flex-wrap gap-4">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Card>
      </section>

      {/* Navigation */}
      <section className="space-y-4" aria-labelledby="navigation-title">
        <h2 className="text-2xl font-semibold" id="navigation">Navigation</h2>
        <Card className="p-6 bg-card text-card-foreground border-border/10">
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
          </Tabs>
        </Card>
      </section>

      {/* Progress Bars */}
      <section className="space-y-4" aria-labelledby="progress-title">
        <h2 className="text-2xl font-semibold" id="progress">Progress</h2>
        <Card className="p-6 space-y-6 bg-card text-card-foreground border-border/10">
          {/* Default Progress */}
          <div className="space-y-2">
            <Label>Default Progress</Label>
            <Progress value={60} />
          </div>

          {/* Small Progress */}
          <div className="space-y-2">
            <Label>Small Progress</Label>
            <Progress value={80} className="h-2" />
          </div>

          {/* Large Progress */}
          <div className="space-y-2">
            <Label>Large Progress</Label>
            <Progress value={40} className="h-6" />
          </div>
        </Card>
      </section>

      {/* Scrollable Content */}
      <section className="space-y-4" aria-labelledby="scrollable-content-title">
        <h2 className="text-2xl font-semibold" id="scrollable-content">Scrollable Content</h2>
        <Card className="p-6 bg-card text-card-foreground border-border/10">
          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted">
                  Scrollable content {i + 1}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </section>

      {/* Alerts */}
      <section className="space-y-4" aria-labelledby="alerts-title">
        <h2 className="text-2xl font-semibold" id="alerts">Alerts</h2>
        <Card className="p-6 space-y-4 bg-card text-card-foreground border-border/10">
          <Alert>
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>This is a default alert message.</AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertTitle>Destructive Alert</AlertTitle>
            <AlertDescription>This is a destructive alert message.</AlertDescription>
          </Alert>
        </Card>
      </section>

      {/* Alert Dialog */}
      <section className="space-y-4" aria-labelledby="alert-dialogs-title">
        <h2 className="text-2xl font-semibold" id="alert-dialogs">Alert Dialogs</h2>
        <Card className="p-6 bg-card text-card-foreground border-border/10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button>Open Alert Dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </section>

      {/* Amount Cards */}
      <section className="space-y-4" aria-labelledby="amount-cards-title">
        <h2 className="text-2xl font-semibold" id="amount-cards">Amount Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Default Variant */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Default Variant</h3>
            <AmountCard
              title="Available to Invest"
              amount={sampleAmounts.available}
              icon={<Wallet className="h-4 w-4" />}
              subtitle="Available for trading"
            />
          </Card>

          {/* Compute Variant */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Compute Variant</h3>
            <AmountCard
              title="AI Computes"
              amount={sampleAmounts.invested}
              icon={<CircleDollarSign className="h-4 w-4" />}
              variant="compute"
              activePlans={3}
            />
          </Card>

          {/* Rank Variant */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Rank Variant</h3>
            <AmountCard
              title="Current Rank"
              amount={0}
              icon={<Users className="h-4 w-4" />}
              variant="rank"
              currentRank="Gold"
              nextRank="Platinum" 
              progress={75}
            />
          </Card>
        </div>
      </section>

      {/* KYC Status Variants */}
      <section className="space-y-4" aria-labelledby="kyc-status-title">
        <h2 className="text-2xl font-semibold" id="kyc-status">KYC Status Variants</h2>
        <div className="grid gap-4">
          <KycVariant status="completed" date={new Date()} />
          <KycVariant status="processing" date={new Date()} />
          <KycVariant 
            status="rejected" 
            date={new Date()}
          />
          <KycVariant status="required" />
        </div>
      </section>

      {/* Transaction Table */}
      <section className="space-y-4" aria-labelledby="transaction-table-title">
        <h2 className="text-2xl font-semibold" id="transaction-table">Transaction Table</h2>
        <Card className="p-6 bg-card text-card-foreground border-border/10">
          <TransactionTable 
            transactions={sampleTransactions}
            onCopyId={(id) => {
              navigator.clipboard.writeText(id);
              // You would typically show a toast here
            }}
          />
        </Card>
      </section>

      {/* Shared Components */}
      <section className="space-y-4" aria-labelledby="shared-components-title">
        <h2 className="text-2xl font-semibold" id="shared-components">Shared Components</h2>
        <Card className="p-6 space-y-8 bg-card text-card-foreground border-border/10">
          {/* Dashboard Topbar */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dashboard Topbar</h3>
            <div className="border rounded-lg overflow-hidden">
              <DashboardTopbar />
            </div>
          </div>

          {/* Regular Topbar */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Regular Topbar</h3>
            <div className="border rounded-lg overflow-hidden">
              <Topbar 
                title="Example Title" 
                hideBackButton={false}
                hideBalance={false}
              />
            </div>
          </div>

          {/* Balance Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Balance Cards</h3>
            <BalanceCards />
          </div>
        </Card>
      </section>
    </div>
  );
};

export default DesignSystem;
