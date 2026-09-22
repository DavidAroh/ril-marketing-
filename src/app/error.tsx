"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div role="alert" className="rounded-lg border p-8 text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An unexpected error occurred. Your data is safe.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
