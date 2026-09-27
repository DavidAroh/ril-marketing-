"use client";

import { useActionState } from "react";
import { MegaphoneIcon } from "lucide-react";
import {
  disconnectBufferAction,
  refreshBufferChannels,
  type BufferChannel,
  type IntegrationResult,
} from "@/actions/integrations";
import { ConnectorCard } from "@/components/settings/connector-card";
import { Button } from "@/components/ui/button";

/**
 * Buffer is the one connector that signs in through the provider rather than
 * taking a pasted key, so "Connect" is a plain link into the OAuth route and
 * the callback returns here with a status banner.
 */
export function BufferConnector({
  connected,
  envConfigured,
  channels,
  organizationName,
}: {
  connected: boolean;
  /** Publishing is only offered once the workspace has a registered Buffer app. */
  envConfigured: boolean;
  channels: BufferChannel[];
  organizationName: string | null;
}) {
  const [refresh, refreshAction, refreshing] = useActionState<
    IntegrationResult | null,
    FormData
  >(async () => refreshBufferChannels(), null);
  const [disconnect, disconnectAction, disconnecting] = useActionState<
    IntegrationResult | null,
    FormData
  >(async () => disconnectBufferAction(), null);

  const isConnected = disconnect?.ok ? false : connected;
  const channelList = refresh?.ok && refresh.channels ? refresh.channels : channels;

  // A paused queue silently stops scheduled posts from going out, and a
  // disconnected channel accepts a post then drops it. Both are worth surfacing.
  const needsAttention = channelList.filter(
    (channel) => channel.isQueuePaused || channel.isDisconnected || channel.isLocked
  );

  return (
    <ConnectorCard
      icon={<MegaphoneIcon />}
      title="Buffer"
      blurb="Publish approved content to every social channel you have linked in Buffer."
      connected={isConnected}
      badge={
        isConnected
          ? [
              organizationName,
              `${channelList.length} ${channelList.length === 1 ? "channel" : "channels"}`,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
    >
      {isConnected ? (
        <div className="flex flex-col gap-3">
          {channelList.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {channelList.map((channel) => (
                <li
                  key={channel.id}
                  className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground">
                    {channel.descriptor}
                  </span>
                  {channel.name ? ` · ${channel.name}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No channels linked yet. Connect your social accounts inside
              Buffer, then refresh.
            </p>
          )}

          {needsAttention.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-400">
              {needsAttention.map((channel) => (
                <li key={channel.id}>
                  {channel.descriptor}
                  {channel.isDisconnected
                    ? " is disconnected — reconnect it in Buffer."
                    : channel.isLocked
                      ? " is locked by your Buffer plan."
                      : " has a paused queue, so scheduled posts will not go out."}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              formAction={refreshAction}
              variant="outline"
              size="sm"
              disabled={refreshing || disconnecting}
            >
              {refreshing ? "Refreshing…" : "Refresh channels"}
            </Button>
            <form action={disconnectAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={refreshing || disconnecting}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            </form>
          </div>
        </div>
      ) : envConfigured ? (
        <Button asChild size="sm">
          <a href="/api/integrations/buffer/connect">Connect Buffer</a>
        </Button>
      ) : (
        <p className="max-w-[60ch] text-xs leading-5 text-muted-foreground">
          Social publishing isn&apos;t switched on for this workspace yet. Ask a
          workspace owner to enable Buffer, then come back to this page.
        </p>
      )}

      {refresh?.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {refresh.error}
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
