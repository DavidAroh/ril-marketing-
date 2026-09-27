import type { ReactNode } from "react";
import { StatusStamp } from "@/components/ui/status-stamp";

/**
 * Shared frame for every connector on Settings → AI: what the service is for,
 * whether it is connected, and the one action that changes that. Presentational
 * only — each connector owns its own connect flow underneath.
 */
export function ConnectorCard({
  icon,
  title,
  blurb,
  connected,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  blurb: string;
  connected: boolean;
  /** Short factual line under the blurb, e.g. the connected account. */
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="slip flex flex-col px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground [&_svg]:size-4"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="mt-0.5 max-w-[54ch] text-xs leading-5 text-muted-foreground">
              {blurb}
            </p>
            {badge ? <p className="dateline mt-1.5">{badge}</p> : null}
          </div>
        </div>
        <StatusStamp variant={connected ? "approved" : "cold"}>
          {connected ? "CONNECTED" : "NOT CONNECTED"}
        </StatusStamp>
      </div>
      <div className="mt-3.5 border-t border-border pt-3.5">{children}</div>
    </section>
  );
}
