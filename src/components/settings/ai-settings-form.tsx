"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { saveAiSettings, testAiSettings } from "@/actions/content";
import {
  PROVIDERS,
  PROVIDER_KEYS,
  defaultModel,
  isSupportedModel,
  type ProviderKey,
} from "@/lib/ai/providers";

interface SaveState {
  ok: boolean;
  error?: string;
}
interface TestState {
  ok: boolean;
  models?: number;
  error?: string;
}

const initialProvider: ProviderKey = "openai";

/**
 * Provider → key → model, with Save and a free connectivity Test
 * (never spends a generation call). A blank key keeps the stored one.
 */
export function AiSettingsForm({
  initial,
}: {
  initial: { provider: string; model: string; hasKey: boolean; last4: string | null };
}) {
  const startProvider = (PROVIDER_KEYS as string[]).includes(initial.provider)
    ? (initial.provider as ProviderKey)
    : initialProvider;
  const [provider, setProvider] = useState<ProviderKey>(startProvider);
  const [model, setModel] = useState<string>(
    isSupportedModel(startProvider, initial.model)
      ? initial.model
      : defaultModel(startProvider)
  );
  const [disconnected, setDisconnected] = useState(false);

  const [saveState, saveAction, savePending] = useActionState<
    SaveState | null,
    FormData
  >(async (_prev, fd) => saveAiSettings(fd), null);
  const [testState, testAction, testPending] = useActionState<
    TestState | null,
    FormData
  >(async (_prev, fd) => testAiSettings(fd), null);

  const def = PROVIDERS[provider];
  const keyNote =
    initial.hasKey && !disconnected
      ? `Stored key ••••${initial.last4 ?? ""} — leave blank to keep it.`
      : "Paste your API key.";

  const onProviderChange = (next: ProviderKey) => {
    setProvider(next);
    if (!isSupportedModel(next, model)) setModel(defaultModel(next));
    setDisconnected(false);
  };

  return (
    <form action={saveAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Provider
          <select
            name="provider"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as ProviderKey)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PROVIDER_KEYS.map((k) => (
              <option key={k} value={k}>
                {PROVIDERS[k].label}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-muted-foreground">
            {def.keyHelp}
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Model
          <select
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {def.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        API key
        <input
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={def.keyPlaceholder}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-xs font-normal text-muted-foreground">{keyNote}</span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={savePending || testPending}>
          {savePending ? "Saving…" : "Save settings"}
        </Button>
        <Button
          type="submit"
          formAction={testAction}
          variant="outline"
          disabled={savePending || testPending}
        >
          {testPending ? "Testing…" : "Test connection"}
        </Button>
        {initial.hasKey && !disconnected && !saveState?.ok ? (
          <Button
            type="submit"
            name="disconnect"
            value="1"
            variant="ghost"
            className="text-muted-foreground"
            disabled={savePending}
            onClick={() => setDisconnected(true)}
          >
            Disconnect
          </Button>
        ) : null}
      </div>

      {saveState?.ok ? (
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Saved.
        </p>
      ) : saveState?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {saveState.error}
        </p>
      ) : null}

      {testState?.ok ? (
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Connected{testState.models ? ` — ${testState.models} models available` : ""}.
        </p>
      ) : testState?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {testState.error}
        </p>
      ) : null}
    </form>
  );
}
