import { FlaskConical } from "lucide-react";

/** Product identity lockup — same mark as the dashboard sidebar. */
export function BrandLockup() {
  return (
    <div className="mb-6 flex flex-col items-center gap-1.5 text-center">
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
      >
        <FlaskConical className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-base font-semibold leading-tight">RIL Growth</p>
      <p className="-mt-1 text-sm text-muted-foreground">Audience Intelligence</p>
    </div>
  );
}
