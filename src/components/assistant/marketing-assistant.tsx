"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { askMarketingAssistant } from "@/actions/assistant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const questions = [
  "What should I work on next?",
  "Which audience insights should shape the next campaign?",
  "How can we improve registrations for upcoming activities?",
];

export function MarketingAssistant({ aiConnected }: { aiConnected: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setAnswer(""); setModel("");
    startTransition(async () => {
      const result = await askMarketingAssistant(question);
      if (!result.ok) setError(result.error ?? "Could not answer this question.");
      else { setAnswer(result.answer ?? ""); setModel(result.model ?? ""); }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="slip flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <p className="dateline">Grounded in your workspace</p>
          <h2 className="mt-1 text-base font-bold">Ask about the next move</h2>
          <p className="mt-1 text-sm text-muted-foreground">Answers use current campaign, activity, content and lead totals, approved audience insights, and active brand guidance. When connected, your question and these limited workspace signals are sent to the configured AI provider for this request; lead contact details are never sent.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What should the team prioritize this week?" rows={4} maxLength={1200} required minLength={3} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{aiConnected ? "AI response is grounded in this organization’s live data." : "Connect an AI provider to enable natural-language answers."}</p>
            <Button type="submit" disabled={busy || question.trim().length < 3}>{busy ? "Reviewing workspace…" : "Ask assistant"}</Button>
          </div>
        </form>
        {!answer && !busy ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="dateline">Try asking</p>
            <div className="flex flex-wrap gap-2">{questions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground">{item}</button>)}</div>
          </div>
        ) : null}
      </section>
      {error ? <p role="alert" className="slip border-destructive p-4 text-sm text-destructive">{error}</p> : null}
      {answer ? (
        <section className="slip p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="dateline">Assistant recommendation</p><p className="dateline">{model === "workspace-summary" ? <Link href="/settings/ai" className="text-primary hover:underline">Connect AI provider</Link> : `Model · ${model}`}</p></div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{answer}</p>
        </section>
      ) : null}
    </div>
  );
}
