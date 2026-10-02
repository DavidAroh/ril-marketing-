"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Plus, ShieldCheck } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { navGroups } from "@/components/app-shared";

export function AppSidebar() {
  const [query, setQuery] = useState("");
  const { setOpenMobile } = useSidebar();
  const groups = navGroups.map(group => ({ ...group, items: group.items.filter(item => item.title.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.items.length);
  return (
    <Sidebar collapsible="icon" variant="sidebar" className="workspace-sidebar">
      <SidebarHeader className="gap-4 px-3 pb-3 pt-5">
        <SidebarMenuButton asChild className="h-auto hover:bg-transparent" tooltip="Renaissance Innovation Labs">
          <Link href="/dashboard" onClick={() => setOpenMobile(false)} aria-label="Renaissance Innovation Labs — overview">
            <Image
              src="/logo/blackLogo.svg"
              alt=""
              width={100}
              height={45}
              className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden"
            />
            <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-flag font-bold text-white group-data-[collapsible=icon]:flex" aria-hidden="true">R</span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden"><span className="block text-sm font-bold">Renaissance</span><span className="block text-[11px] text-muted-foreground">Marketing workspace</span></span>
          </Link>
        </SidebarMenuButton>
        <label className="workspace-sidebar-search flex h-9 items-center gap-2 border px-2.5 group-data-[collapsible=icon]:hidden">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a page…" aria-label="Find a page" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
        </label>
        <SidebarMenuButton
          asChild
          tooltip="Log activity"
          className="h-9 justify-center border-0 bg-flag text-white hover:bg-flag/90"
        >
          <Link href="/activities/new" onClick={() => setOpenMobile(false)}><Plus className="size-4" /><span>Log activity</span></Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpenMobile(false); }}>
        <nav aria-label="Workspace navigation">
          {groups.map((group, index) => <NavGroup key={group.label ?? index} {...group} />)}
          {groups.length === 0 && <p className="px-5 py-6 text-xs text-muted-foreground" role="status">No pages match “{query}”.</p>}
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-start gap-2.5 group-data-[collapsible=icon]:hidden">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div><p className="text-xs font-semibold text-foreground">You’re in control</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">AI recommends. You approve.</p></div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
