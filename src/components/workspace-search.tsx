"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { navGroups } from "@/components/app-shared";

export function WorkspaceSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const groups = navGroups.map(group => ({ ...group, items: group.items.filter(item => `${item.title} ${group.label ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.items.length);
  return (
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setQuery(""); }}>
      <DialogTrigger asChild>
        <button type="button" aria-label="Search workspace pages" className="flex h-9 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted">
          <Search className="size-4" /><span className="hidden lg:inline">Find a page</span><kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] lg:inline">Ctrl K</kbd>
        </button>
      </DialogTrigger>
      <DialogContent data-workspace-portal="" className="w-[calc(100%_-_2rem)] gap-0 overflow-hidden rounded-xl bg-card p-0 sm:max-w-xl">
        <div className="border-b p-5 pr-12">
          <DialogTitle>Find a workspace page</DialogTitle>
          <DialogDescription className="mt-1">Jump to the next step in your marketing workflow.</DialogDescription>
          <label className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/40 px-3">
            <Search className="size-4 text-muted-foreground" />
            <input aria-label="Search pages" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Content, leads, approvals…" className="h-11 w-full bg-transparent text-sm outline-none" />
          </label>
        </div>
        <nav aria-label="Page search results" className="max-h-[55vh] overflow-y-auto p-2">
          {groups.map((group,index) => <div key={group.label ?? index}>
            <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted-foreground">{group.label ?? "Start here"}</p>
            {group.items.map(item => <Link key={item.path} href={item.path!} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted focus-visible:bg-muted [&>svg]:size-4">
              {item.icon}<span className="flex-1">{item.title}</span><ArrowUpRight className="text-muted-foreground" />
            </Link>)}
          </div>)}
          {!groups.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground" role="status">No pages match “{query}”. Try content, email, or settings.</p>}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
