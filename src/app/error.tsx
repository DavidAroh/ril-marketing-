"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="recovery-page flex min-h-dvh items-center justify-center p-6">
      <div role="alert" className="slip max-w-sm rounded-2xl px-8 py-10 text-center shadow-sm">
        <p className="dateline tabular-nums">Unexpected error</p>
        <h1 className="mt-2 text-balance text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-balance text-[13px] leading-5 text-muted-foreground">
          We could not load this page. Try again, or return to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} variant="outline" className="group min-h-10 rounded-lg font-semibold">
            <RotateCcw className="size-4 transition-transform duration-200 group-hover:-rotate-12" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild className="group min-h-10 rounded-lg font-semibold">
            <Link href="/dashboard">
              Back to dashboard
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
