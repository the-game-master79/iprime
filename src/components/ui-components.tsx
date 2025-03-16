import React from 'react';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export const StatCard = ({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
  className,
  ...props
}: StatCardProps) => {
  return (
    <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-md rounded-xl", className)} {...props}>
      <CardHeader className="pb-2">
        {(title || icon) && (
          <>
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28 my-1" />
        ) : (
          <div className="text-2xl font-bold text-foreground/90">{value}</div>
        )}
        {description && (
          <div className="text-xs text-muted-foreground mt-1">
            {loading ? <Skeleton className="h-3 w-full" /> : description}
          </div>
        )}
        {trend && !loading && (
          <div className="flex items-center gap-1 mt-2">
            <span className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              {trend.isPositive ? "+" : "-"}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">vs. last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHeader = ({ title, description, action }: SectionHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

export const FeatureCard = ({
  title,
  description,
  icon,
  className,
  action,
}: FeatureCardProps) => {
  return (
    <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="pb-3">
        <div className="mb-3 h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <CardDescription>{description}</CardDescription>
      </CardContent>
      {action && (
        <CardFooter className="pt-0">
          <Button variant="link" onClick={action.onClick} className="px-0 h-auto font-medium">
            {action.text}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="page-transition-enter animate-fade-in">
      {children}
    </div>
  );
};

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode; // Added action prop
}

export const PageHeader = ({ 
  title, 
  description,
  children,
  action 
}: PageHeaderProps) => {
  return (
    <div className="flex flex-col gap-1 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
      <Separator className="mt-4" />
    </div>
  );
};

export const EmptyState = ({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 my-8 border border-dashed rounded-lg bg-muted/20">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
