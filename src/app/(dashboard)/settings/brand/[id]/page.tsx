import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCallerOrganizationId } from "@/lib/supabase/organization";
import { getBrandKnowledgeEntry } from "@/lib/brand/knowledge";
import { BrandKnowledgeForm } from "@/components/brand/brand-knowledge-form";

export const metadata: Metadata = { title: "Edit brand knowledge" };

export default async function EditBrandKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, organizationId] = await Promise.all([
    params,
    getCallerOrganizationId().catch(() => null),
  ]);
  if (!organizationId) notFound();
  const entry = await getBrandKnowledgeEntry(organizationId, id).catch(() => null);
  if (!entry) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
      <header>
        <Link href="/settings/brand" className="text-sm font-semibold text-primary hover:underline">
          Brand Knowledge
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Edit entry</h1>
      </header>
      <BrandKnowledgeForm entry={entry} />
    </div>
  );
}
