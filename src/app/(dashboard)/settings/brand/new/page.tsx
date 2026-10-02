import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandKnowledgeForm } from "@/components/brand/brand-knowledge-form";

export const metadata: Metadata = { title: "Add brand knowledge" };

export default function NewBrandKnowledgePage() {
  return (
    <div className="workspace-page mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
      <header>
        <Link href="/settings/brand" className="group inline-flex min-h-9 items-center gap-1.5 rounded-md text-[13px] font-semibold text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
          Brand Knowledge
        </Link>
        <h1 className="mt-2 text-balance">Add an entry</h1>
      </header>
      <BrandKnowledgeForm />
    </div>
  );
}
