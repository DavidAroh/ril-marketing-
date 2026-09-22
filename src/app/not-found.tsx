import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="rounded-lg border p-8 text-center">
        <p className="font-mono text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-1 text-lg font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
