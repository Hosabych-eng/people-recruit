import { SidebarNav } from "@/components/layout/SidebarNav";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <SidebarNav />
      <main className="crm-compact flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
