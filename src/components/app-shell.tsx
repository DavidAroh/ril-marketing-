import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({
	children,
	userEmail,
}: {
	children: React.ReactNode;
	userEmail?: string;
}) {
	return (
		<div className="workspace overflow-hidden">
			<SidebarProvider className="relative h-svh">
				<AppSidebar />
				<SidebarInset id="main" tabIndex={-1} className="min-w-0 bg-background">
					<AppHeader userEmail={userEmail} />
				<div className="workspace-scroll flex flex-1 flex-col overflow-y-auto px-4 pb-12 pt-6 md:px-8 md:pt-8">
					<div className="mx-auto w-full max-w-[1500px]">{children}</div>
				</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
