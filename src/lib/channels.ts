/** Channel/platform slug → human label. Single source of truth for display names. */
const CHANNEL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  twitter: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
  email: "Email",
  website: "Website",
  events: "Events",
  paid_ads: "Paid ads",
  pr: "PR",
  other: "Other",
};

export function channelLabel(slug: string | null | undefined): string {
  if (!slug) return "";
  return CHANNEL_LABELS[slug.toLowerCase()] ?? slug;
}
