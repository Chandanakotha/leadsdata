import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, Activity, LogOut } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";
import { useLogout, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Template", href: "/template", icon: FileText },
  { name: "Logs", href: "/logs", icon: Activity },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const logoutMutation = useLogout();

  const currentItem = navItems.find(item => item.href === location) || navItems[0];

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast.success("Signed out");
      },
    });
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-2 font-semibold text-lg text-primary">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
                <Activity size={18} />
              </div>
              Outreach
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col justify-between h-full">
            <SidebarMenu className="px-2 py-4 gap-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {me?.authRequired && (
              <div className="px-2 pb-4">
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          <header className="h-16 flex items-center px-6 border-b border-border shrink-0 bg-background/95 backdrop-blur z-10">
            <div className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <span>Overview</span>
              <span className="text-border">/</span>
              <span className="text-foreground">{currentItem.name}</span>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
