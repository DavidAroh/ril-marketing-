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
    <div className={cn("slip px-6 py-12 text-center sm:px-8", className)}>
      <h3 className="text-balance text-[15px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-balance text-[13px] leading-5 text-muted-foreground">
        {description}
      </p>
      {action && (
        <Button asChild size="sm" className="mt-5 min-h-9 rounded-lg font-semibold">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
