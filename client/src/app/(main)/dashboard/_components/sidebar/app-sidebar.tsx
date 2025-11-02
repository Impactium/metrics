"use client";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { NavMain } from "./nav-main";
import { Icon } from "@impactium/icons";
import { NavUser } from "./nav-user";
import { NavGroup } from "@/navigation/sidebar/sidebar-items";
import { useState, useEffect, useMemo } from "react";
import { User } from "@/hooks/user";
import { capitalize } from "@impactium/utils";

const getIconForModule = (module: string): Icon.Name => {
  switch (module) {
    case 'speedtest': return 'Gauge';
    case 'logs': return 'FunctionSquare';
    default: return 'Status';
  }
}

const defaultItemsList = ['speedtest', 'logs'];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    User.use().then(setUser);
  }, []);

  const sidebarItems: NavGroup[] = useMemo(() => [
    {
      id: 1,
      label: "Dashboards",
      items: defaultItemsList.map((module: string) => ({
        title: capitalize(module),
        url: `/dashboard/${module}`,
        icon: getIconForModule(module),
        disabled: user ? !user.permissions.allowed.includes(module) : true
      }))
    },
    {
      id: 2,
      label: "Pages",
      items: [
        {
          title: "Email",
          url: "/dashboard/coming-soon",
          icon: 'Mail',
          comingSoon: true,
        },
      ],
    },
  ], [user]);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard">
                <Icon name="LogoImpactium" style={{ width: 20, height: 20 }} />
                <span style={{ lineHeight: 32, fontWeight: 400 }} className="text-xl font-semibold font-nunito">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
