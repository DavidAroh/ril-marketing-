import type { Metadata } from "next";
import { AsciiLogo } from "@/components/auth/ascii-logo";

export const metadata: Metadata = { title: "Sign in" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex min-h-screen items-stretch bg-background">
      <h1 className="sr-only">RIL Audience Intelligence — authentication</h1>

      {/* Left: the form column */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16">
        <div className="stagger mx-auto w-full max-w-sm">
          {children}
        </div>
      </div>

      {/* Right: the columns on the RIL blue panel */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block lg:w-1/2"
      >
        <AsciiLogo className="absolute inset-0 flex items-center justify-center text-primary-foreground/90" />
      </aside>
    </main>
  );
}
