import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("slip px-6 py-12 text-center", className)}>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <Button asChild className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
