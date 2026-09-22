import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusStamp } from "@/components/ui/status-stamp";
import { cn } from "@/lib/utils";

export interface DecisionCardProps {
  wireNumber?: string;
  title: string;
  description?: string;
  status?: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  metadata?: string;
  className?: string;
  isFirst?: boolean;
}

export function DecisionCard({
  wireNumber,
  title,
  description,
  status,
  primaryAction,
  secondaryAction,
  metadata,
  className,
  isFirst = false,
}: DecisionCardProps) {
  return (
    <div className={cn("slip px-4 py-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            {wireNumber && <span className="dateline">{wireNumber}</span>}
            {status && (
              <>
                {wireNumber && <span className="text-muted-foreground">·</span>}
                <StatusStamp status={status} />
              </>
            )}
            {metadata && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="dateline">{metadata}</span>
              </>
            )}
          </div>
          <h3 className="mt-1.5 font-medium text-sm">{title}</h3>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {secondaryAction && (
            <Button variant="outline" size="sm" asChild>
              <Link href={secondaryAction.href}>
                {secondaryAction.label}
              </Link>
            </Button>
          )}
          {primaryAction && (
            <Button variant={isFirst ? "default" : "outline"} size="sm" asChild>
              <Link href={primaryAction.href}>
                {primaryAction.label}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
