"use client";

import { useActionState, useEffect, useState } from "react";
import { TrendingUpIcon } from "lucide-react";
import {
  disconnectGoogleAnalytics,
  saveGoogleAnalyticsSettings,
} from "@/actions/google-analytics";
import { ConnectorCard } from "@/components/settings/connector-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = { ok: boolean; message?: string; error?: string };

/**
 * Google needs a read-only service account rather than a sign-in, so the card
 * leads with the two IDs a user can copy out of their dashboards and keeps the
 * key file behind an "Advanced" step with plain instructions.
 */
export function GoogleAnalyticsSettingsForm({
  initial,
}: {
  initial: {
    connected: boolean;
    propertyId: string;
    searchConsoleSiteUrl: string;
  };
}) {
  const [save, saveAction, saving] = useActionState<State | null, FormData>(
    async (_previous, data) => saveGoogleAnalyticsSettings(data),
    null
  );
  const [disconnect, disconnectAction, disconnecting] = useActionState<
    State | null,
    FormData
  >(async () => disconnectGoogleAnalytics(), null);

  const connected = disconnect?.ok
    ? false
    : save?.ok
      ? true
      : initial.connected;
  const [open, setOpen] = useState(!initial.connected);
  useEffect(() => {
    if (save?.ok) setOpen(false);
  }, [save?.ok]);

  return (
    <ConnectorCard
      icon={<TrendingUpIcon />}
      title="Google Analytics & Search Console"
      blurb="Add website traffic and search performance to your reports."
      connected={connected}
      badge={connected ? `GA4 property ${initial.propertyId}` : undefined}
    >
      {open ? (
        <form action={saveAction} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              GA4 property ID
              <Input
                name="ga4PropertyId"
                inputMode="numeric"
                required
                pattern="[0-9]{4,20}"
                placeholder="123456789"
                defaultValue={initial.propertyId}
                className="font-normal"
              />
              <span className="text-xs font-normal text-muted-foreground">
                In Analytics, open Admin then Property settings. It&apos;s the
                number at the top.
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Search Console property
              <Input
                name="searchConsoleSiteUrl"
                required
                placeholder="https://example.org/"
                defaultValue={initial.searchConsoleSiteUrl}
                className="font-normal"
              />
              <span className="text-xs font-normal text-muted-foreground">
                Copy it exactly as Search Console shows it — a URL prefix or a
                domain property like sc-domain:example.org.
              </span>
            </label>
          </div>

          <details open={!connected} className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              {connected
                ? "Advanced: replace the Google key (optional)"
                : "Advanced: add your Google key"}
            </summary>
            <div className="border-t border-border px-3 py-3">
              <ol className="list-decimal space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
                <li>
                  In Google Cloud, create a service account and download its
                  JSON key file.
                </li>
                <li>
                  Turn on the Analytics Data API and the Search Console API for
                  that project.
                </li>
                <li>
                  Give the service account&apos;s email address Viewer access to
                  your GA4 property, and add it as a user in Search Console.
                </li>
                <li>Paste the JSON key file below.</li>
              </ol>
              <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
                Service-account JSON key
                <textarea
                  name="credentialsJson"
                  autoComplete="off"
                  spellCheck={false}
                  rows={5}
                  maxLength={12000}
                  placeholder={
                    connected
                      ? "Leave blank to keep the saved key"
                      : "Paste the complete JSON key file"
                  }
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                The key is encrypted before storage. It is never included in
                reports and never sent to your AI provider. Use a dedicated,
                least-privilege account and revoke the key if it is ever
                exposed.
              </p>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={saving || disconnecting}>
              {saving
                ? "Checking access…"
                : connected
                  ? "Save changes"
                  : "Connect Google Analytics"}
            </Button>
            {connected ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Update details
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setOpen(true)}
              disabled={saving}
            >
              Connect Google Analytics
            </Button>
          )}
          {connected ? (
            <form action={disconnectAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            </form>
          ) : null}
        </div>
      )}

      {save?.message ? (
        <p
          role="status"
          className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
        >
          {save.message}
        </p>
      ) : null}
      {save?.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {save.error}
        </p>
      ) : null}
      {disconnect?.message ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {disconnect.message}
        </p>
      ) : null}
      {disconnect?.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {disconnect.error}
        </p>
      ) : null}
    </ConnectorCard>
  );
}
