import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const stampVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 font-sans text-[0.6875rem] font-bold uppercase tracking-[0.08em] transition-colors",
  {
    variants: {
      variant: {
        pending: "border-flag bg-flag/5 text-flag",
        approved: "border-emerald-600 bg-emerald-600/5 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400",
        hot: "border-red-500 bg-red-500/5 text-red-600 dark:border-red-400 dark:text-red-400",
        warm: "border-amber-500 bg-amber-500/5 text-amber-600 dark:border-amber-400 dark:text-amber-400",
        cold: "border-border bg-muted/50 text-muted-foreground",
        failed: "border-destructive bg-destructive/5 text-destructive",
        scheduled: "border-border bg-card text-foreground",
        published: "border-emerald-600 bg-emerald-600/5 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400",
        review: "border-flag bg-flag/5 text-flag",
        editing: "border-border bg-card text-foreground",
        idea: "border-border bg-muted text-muted-foreground",
        ai_generated: "border-flag bg-flag/5 text-flag",
        qualified: "border-emerald-600 bg-emerald-600/5 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400",
        suppressed: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "pending",
    },
  }
);

export interface StatusStampProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof stampVariants> {
  status?: string;
}

export function StatusStamp({ className, variant, status, ...props }: StatusStampProps) {
  // Map status strings to variants
  const mappedVariant = status ? mapStatusToVariant(status) : variant;
  const displayText = status ? formatStatusText(status) : props.children;

  return (
    <span
      className={cn(stampVariants({ variant: mappedVariant }), className)}
      {...props}
    >
      {displayText || props.children}
    </span>
  );
}

function mapStatusToVariant(status: string): StatusStampProps["variant"] {
  const normalized = status.toLowerCase().replace(/[_\s]+/g, "_");

  switch (normalized) {
    case "pending_review":
    case "pending":
      return "pending";
    case "approved":
      return "approved";
    case "hot":
      return "hot";
    case "warm":
      return "warm";
    case "cold":
      return "cold";
    case "failed":
      return "failed";
    case "scheduled":
      return "scheduled";
    case "published":
      return "published";
    case "review":
      return "review";
    case "editing":
      return "editing";
    case "analysing":
      return "scheduled";
    case "idea":
      return "idea";
    case "ai_generated":
      return "ai_generated";
    case "qualified":
      return "qualified";
    case "converted":
      return "approved";
    case "suppressed":
    case "dismissed":
      return "suppressed";
    case "draft":
      return "idea";
    case "paused":
      return "cold";
    case "completed":
      return "approved";
    case "active":
      return "pending";
    default:
      return "pending";
  }
}

function formatStatusText(status: string): string {
  return status
    .replace(/[_\s]+/g, " ")
    .toUpperCase();
}
