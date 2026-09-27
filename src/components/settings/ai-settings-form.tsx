"use client";

import { useActionState, useEffect, useState } from "react";
import {
  connectAiProvider,
  disconnectAiProvider,
  type ConnectAiResult,
} from "@/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiProviderMark } from "@/components/settings/provider-icons";
import {
  PROVIDERS,
  PROVIDER_KEYS,
  defaultModel,
  getModel,
  isProviderKey,
  isSupportedModel,
  modelLabel,
  type ProviderKey,
} from "@/lib/ai/providers";
import { cn } from "@/lib/utils";

const KEY_URL_LABEL = "Where do I find this?";

/**
 * Bring-your-own-key, in four steps and one button: pick a provider, pick a
 * model, paste the key, Connect. The server checks the key before storing it,
 * so a failed Connect means nothing was saved. Once connected the form
 * collapses to a one-line summary with Change / Disconnect.
 */
export function AiSettingsForm({
  initial,
}: {
  initial: {
    provider: string;
    model: string;
    hasKey: boolean;
    last4: string | null;
  };
}) {
  const startProvider: ProviderKey = isProviderKey(initial.provider)
    ? initial.provider
    : "openai";
  const [provider, setProvider] = useState<ProviderKey>(startProvider);
  const [model, setModel] = useState<string>(() =>
    isSupportedModel(startProvider, initial.model)
      ? initial.model
      : defaultModel(startProvider)
  );
  const [editing, setEditing] = useState(!initial.hasKey);

  const [connect, connectAction, connecting] = useActionState<
    ConnectAiResult | null,
    FormData
  >(async (_previous, formData) => connectAiProvider(formData), null);
  const [disconnect, disconnectAction, disconnecting] = useActionState<
    ConnectAiResult | null,
    FormData
  >(async () => disconnectAiProvider(), null);

  const justConnected = connect?.ok === true;
  useEffect(() => {
    if (justConnected) setEditing(false);
  }, [justConnected]);

  const connected = disconnect?.ok ? false : justConnected || initial.hasKey;
  const def = PROVIDERS[provider];
  const selected = getModel(provider, model);

  const summaryProvider = justConnected
    ? connect.providerLabel ?? def.label
    : PROVIDERS[startProvider].label;
  const summaryModel = justConnected
    ? connect.modelLabel ?? connect.model ?? ""
    : modelLabel(startProvider, initial.model);
  const summaryLast4 = justConnected ? connect.last4 ?? null : initial.last4;

  const onProviderChange = (next: ProviderKey) => {
    setProvider(next);
    setModel((current) =>
      isSupportedModel(next, current) ? current : defaultModel(next)
    );
  };

  /* ── Connected: one line, plus the two things you might want to do next. ── */
  if (connected && !editing) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AiProviderMark
              provider={justConnected ? provider : startProvider}
              className="size-5 shrink-0 text-foreground"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {summaryProvider} · {summaryModel}
              </p>
              <p className="dateline mt-0.5">
                Key ••••{summaryLast4 || "····"} · ready to use
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Change model
            </Button>
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
          </div>
        </div>
        {justConnected ? (
          <p
            role="status"
            className="text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          >
            Connected. New drafts use {summaryModel} straight away.
          </p>
        ) : null}
        {disconnect?.error ? (
          <p role="alert" className="text-sm text-destructive">
            {disconnect.error}
          </p>
        ) : null}
      </div>
    );
  }

  /* ── Not connected: pick, paste, connect. ── */
  return (
    <form action={connectAction} className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-sm font-medium">1. Which provider?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {PROVIDER_KEYS.map((key) => {
            const option = PROVIDERS[key];
            const isSelected = provider === key;
            return (
              <label
                key={key}
                className={cn(
                  "cursor-pointer rounded-md border p-3 transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                <input
                  type="radio"
                  name="provider"
                  value={key}
                  checked={isSelected}
                  onChange={() => onProviderChange(key)}
                  className="sr-only"
                />
                <span className="flex items-center gap-2">
                  <AiProviderMark
                    provider={key}
                    className="size-5 shrink-0 text-foreground"
                  />
                  <span className="text-sm font-semibold">{option.label}</span>
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                  {option.tagline}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        2. Which model?
        <select
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm font-normal shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {def.models.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-muted-foreground">
          {selected.hint}
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        3. Paste your {def.label} API key
        <Input
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={def.keyPlaceholder}
          className="font-normal"
        />
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs font-normal text-muted-foreground">
          {initial.hasKey
            ? "Leave blank to keep the key you already saved."
            : def.keyHelp}
          <a
            href={def.keyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {KEY_URL_LABEL}
          </a>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={connecting}>
          {connecting ? "Checking your key…" : `4. Connect ${def.label}`}
        </Button>
        {initial.hasKey ? (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setEditing(false)}
            disabled={connecting}
          >
            Cancel
          </Button>
        ) : null}
      </div>

      {connect?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {connect.error}
        </p>
      ) : null}
    </form>
  );
}
