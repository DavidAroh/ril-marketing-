"use client";

import { useActionState, useEffect, useState } from "react";
import { FileTextIcon } from "lucide-react";
import { disconnectWordPress, saveWordPressConnection } from "@/actions/wordpress";
import { ConnectorCard } from "@/components/settings/connector-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = { ok: boolean; message?: string; error?: string };

/**
 * Connect-first connector: the three fields stay hidden until the user asks to
 * connect, and the saved account is what the card shows afterwards.
 */
export function WordPressSettingsForm({
  initial,
}: {
  initial: { connected: boolean; siteUrl: string; username: string };
}) {
  const [save, saveAction, saving] = useActionState<State | null, FormData>(
    async (_previous, data) => saveWordPressConnection(data),
    null
  );
  const [disconnect, disconnectAction, disconnecting] = useActionState<
    State | null,
    FormData
  >(async () => disconnectWordPress(), null);

  const connected = disconnect?.ok
    ? false
    : save?.ok
      ? true
      : initial.connected;
  const [open, setOpen] = useState(!initial.connected);
  useEffect(() => {
    if (save?.ok) setOpen(false);
  }, [save?.ok]);

  const fieldClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <ConnectorCard
      icon={<FileTextIcon />}
      title="WordPress"
      blurb="Send approved blog articles to your own WordPress site."
      connected={connected}
      badge={
        connected
          ? `${initial.siteUrl}${initial.username ? ` · ${initial.username}` : ""}`
          : undefined
      }
    >
      {open ? (
        <form action={saveAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Your WordPress address
            <Input
              name="siteUrl"
              type="url"
              required
              autoComplete="url"
              placeholder="https://example.org"
              defaultValue={initial.siteUrl}
              className="font-normal"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              WordPress username
              <Input
                name="username"
                required
                autoComplete="username"
                defaultValue={initial.username}
                className="font-normal"
              />
              <span className="text-xs font-normal text-muted-foreground">
                The account that will publish the posts.
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Application password
              <input
                name="applicationPassword"
                type="password"
                autoComplete="new-password"
                placeholder={
                  connected
                    ? "Leave blank to keep the saved one"
                    : "Paste the password WordPress gives you"
                }
                className={fieldClass}
              />
              <span className="text-xs font-normal text-muted-foreground">
                Create one in your WordPress profile under{" "}
                <a
                  href="https://wordpress.org/documentation/article/application-passwords/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Application Passwords
                </a>
                . Not your account password.
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={saving || disconnecting}>
              {saving
                ? "Checking your site…"
                : connected
                  ? "Save changes"
                  : "Connect WordPress"}
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
              Connect WordPress
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
