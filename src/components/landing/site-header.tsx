"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "#platform", label: "Platform" },
  { href: "#workflow", label: "Workflow" },
  { href: "#learning", label: "Learning" },
  { href: "#faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-6 sm:px-8">
          <Link
            href="/"
            aria-label="RIL home"
            onClick={() => setOpen(false)}
            className="flex min-w-0 items-center"
          >
            <Image
              src="/logo/blackLogo.svg"
              alt="Renaissance Innovation Labs"
              width={116}
              height={27}
              priority
              className="h-auto w-[116px] max-w-none"
              style={{ height: "27px", width: "auto" }}
            />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="transition-colors duration-200 hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="hidden text-sm font-semibold text-foreground/80 transition-colors duration-200 hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="hidden h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-[hsl(var(--ril-blue-deep))] sm:inline-flex"
            >
              Get started
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex size-10 items-center justify-center md:hidden"
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span
                className="absolute h-[2px] w-5 bg-foreground transition-transform duration-200"
                style={{ transform: open ? "rotate(45deg)" : "translateY(-4px)" }}
              />
              <span
                className="absolute h-[2px] w-5 bg-foreground transition-transform duration-200"
                style={{ transform: open ? "rotate(-45deg)" : "translateY(4px)" }}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 top-0 z-30 flex flex-col bg-background px-6 pb-10 pt-28 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <nav aria-label="Mobile" className="flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b border-border py-5 text-3xl font-bold tracking-tight"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <Link
            href="/sign-up"
            onClick={() => setOpen(false)}
            className="flex h-12 items-center justify-center rounded-md bg-primary text-base font-semibold text-primary-foreground"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="flex h-12 items-center justify-center rounded-md border border-input text-base font-semibold"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}
