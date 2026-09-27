import Link from "next/link";
import Image from "next/image";
import { LogoIcon } from "@/components/logo";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { navGroups } from "@/components/app-shared";

export function AppSidebar() {
	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader className="h-14 justify-center">
				<SidebarMenuButton asChild tooltip="Renaissance Innovation Labs">
					<Link href="/dashboard">
						<LogoIcon className="hidden size-5 shrink-0 group-data-[collapsible=icon]:block" aria-hidden="true" />
						<Image
							src="/logo/blackLogo.svg"
							alt="Renaissance Innovation Labs"
							width={128}
							height={30}
							priority
							className="h-6 w-auto max-w-full dark:hidden group-data-[collapsible=icon]:hidden"
						/>
						<Image
							src="/logo/whiteLogo.svg"
							alt="Renaissance Innovation Labs"
							width={128}
							height={30}
							priority
							className="hidden h-6 w-auto max-w-full dark:block dark:group-data-[collapsible=icon]:hidden"
						/>
					</Link>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				{navGroups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
			</SidebarContent>
			<SidebarFooter>
				<div className="px-2 py-3 group-data-[collapsible=icon]:hidden">
					<p className="dateline">Operating principle</p>
					<p className="mt-1 text-sm font-medium leading-snug text-foreground">
						AI recommends. <span className="text-primary">Humans decide.</span>
					</p>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
