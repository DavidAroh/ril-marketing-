"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { navLinks } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";

export function AppHeader({ userEmail }: { userEmail?: string }) {
	const pathname = usePathname();
	const activeItem = navLinks.find((item) => {
		if (!item.path || item.path.startsWith("#")) return false;
		if (item.path === "/dashboard") return pathname === "/dashboard";
		return pathname === item.path || pathname.startsWith(`${item.path}/`);
	});

	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6"
			)}
		>
			<div className="flex items-center gap-3">
				<CustomSidebarTrigger />
				<Separator
					className="mr-2 h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<AppBreadcrumbs page={activeItem} />
			</div>
			<div className="flex items-center gap-3">
				<NavUser email={userEmail} />
			</div>
		</header>
	);
}
