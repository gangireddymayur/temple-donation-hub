import {
  LayoutDashboard,
  Monitor,
  Image,
  LayoutGrid,
  CalendarClock,
  Settings,
  Tv,
  LogOut,
  CreditCard,
  HeartHandshake,
  Shield,
  History,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth, getTrialInfo } from "@/hooks/useAuth";
import { getReligionConfig } from "@/lib/religion-config";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Devices", url: "/admin/devices", icon: Monitor },
  { title: "Content", url: "/admin/content", icon: Image },
  { title: "Layouts", url: "/admin/layouts", icon: LayoutGrid },
  { title: "Schedule", url: "/admin/schedule", icon: CalendarClock },
  { title: "Donation Content", url: "/admin/settings/donations", icon: HeartHandshake },
  { title: "Payment Settings", url: "/admin/settings/payments", icon: CreditCard },
  { title: "Manage Access", url: "/admin/access", icon: Shield },
  { title: "Audit Trail", url: "/admin/audit-trail", icon: History },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, role, company, religion, isTrialExpired, signOut } = useAuth();
  const relMeta = getReligionConfig(religion);
  const trialInfo = getTrialInfo(company);

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/admin/settings") return location.pathname === "/admin/settings";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xl">
            {relMeta.symbol || <Tv className="h-5 w-5 text-primary-foreground" />}
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight truncate">
                Temple Donation Hub
              </span>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">
                  Admin Panel
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                  {relMeta.shortName}
                </span>
                {company && (
                  <Badge variant={trialInfo.variant as any} className="text-[9px] py-0 px-1.5 h-4 font-mono">
                    {trialInfo.text}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => {
                const isLocked = isTrialExpired && role !== "super_admin" && item.url !== "/admin/settings";

                if (isLocked) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <div
                        className="flex items-center justify-between rounded-md p-2 text-sm text-muted-foreground/40 cursor-not-allowed select-none opacity-50 w-full"
                        title="Trial Expired — Contact Administrator to Unlock"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 opacity-40" />
                          {!collapsed && <span>{item.title}</span>}
                        </div>
                        {!collapsed && (
                          <span className="text-[9px] bg-destructive/20 text-destructive font-bold px-1.5 py-0.5 rounded">
                            Locked
                          </span>
                        )}
                      </div>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end={item.url === "/admin"}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs font-medium text-sidebar-accent-foreground">Company Admin</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
