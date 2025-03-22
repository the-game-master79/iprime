import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui-components";

interface PageLayoutProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ 
  title,
  description,
  action,
  children,
  className
}: PageLayoutProps) {
  return (
    <div className={cn("container space-y-6 p-6 pb-16", className)}>
      <PageHeader title={title} description={description} action={action} />
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
