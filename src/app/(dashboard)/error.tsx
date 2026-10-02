"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="workspace-panel mx-auto max-w-xl p-6 sm:p-8" role="alert">
    <AlertCircle className="mb-4 size-7 text-destructive" aria-hidden="true"/>
    <h1>This page couldn’t load</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">We couldn’t retrieve the workspace data. Try again, or return to the Command Centre while the connection recovers.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Button onClick={reset}>Try again</Button><Button asChild variant="outline"><Link href="/dashboard">Command Centre</Link></Button></div>
  </section>;
}
