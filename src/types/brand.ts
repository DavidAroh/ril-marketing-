export const BRAND_KNOWLEDGE_CATEGORIES = [
  "brand_voice",
  "organization",
  "program",
  "audience",
  "approved_message",
  "terminology",
  "policy",
  "asset",
] as const;

export type BrandKnowledgeCategory = (typeof BRAND_KNOWLEDGE_CATEGORIES)[number];

export interface BrandKnowledgeEntry {
  id: string;
  organization_id: string;
  category: BrandKnowledgeCategory;
  title: string;
  content: string;
  source_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
