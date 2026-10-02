import type { ComponentType } from "react";
import {
  AtSign,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";

/**
 * Social-channel brand marks for the Buffer channel chips. Identification never
 * rests on the glyph alone — the chip text always names the account — so the
 * marks stay small and monochrome (currentColor) like the rest of the app.
 *
 * LinkedIn / Instagram / Twitter / YouTube reuse the installed lucide-react
 * brand icons; TikTok has no lucide equivalent, so it gets a small quaver
 * drawn on the same 24px grid with the same 2px round stroke.
 */
function TiktokMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M14.5 3v13" />
      <path d="M14.5 3c.9 3.4 3.2 5.7 6.5 6.2" />
      <circle cx="11" cy="17" r="3.2" />
    </svg>
  );
}

const MARKS: Record<string, ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: TiktokMark,
};

/** Logo for a Buffer channel, matched on the lowercase service key first. */
export function ChannelMark({
  service,
  descriptor,
  className,
}: {
  service: string;
  descriptor: string;
  className?: string;
}) {
  const byService = MARKS[service.trim().toLowerCase()];
  // Both lucide icons and TiktokMark hide themselves from assistive tech;
  // the chip text always carries the channel identity.
  if (byService) {
    const Mark = byService;
    return <Mark className={className} />;
  }
  const text = descriptor.toLowerCase();
  for (const key of Object.keys(MARKS)) {
    if (text.includes(key)) {
      const Mark = MARKS[key];
      return <Mark className={className} />;
    }
  }
  return <AtSign className={className} />;
}
