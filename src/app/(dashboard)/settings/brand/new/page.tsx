import type { Metadata } from "next";
import Link from "next/link";
import { BrandKnowledgeForm } from "@/components/brand/brand-knowledge-form";

export const metadata: Metadata = { title: "Add brand knowledge" };

export default function NewBrandKnowledgePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
      <header>
        <Link href="/settings/brand" className="text-sm font-semibold text-primary hover:underline">
          Brand Knowledge
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Add an entry</h1>
      </header>
      <BrandKnowledgeForm />
    </div>
  );
}
