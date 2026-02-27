import * as React from "react";
import { ChartBarBig, GalleryVerticalEnd } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Link, NavLink } from "react-router";
import Logo from "@/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Home",
      url: "/user",
    },
    {
      title: "Blocker",
      url: "#",
    },
    {
      title: "Sessions",
      url: "/user/sessions",
    },
    {
      title: "Murmure",
      url: "#",
    },
    {
      title: "Gemestream",
      url: "#",
    },
  ],
};

export function AppSidebar({ ...props }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="#">
                <div className="grid size-9.5 place-items-center rounded-lg border border-border bg-card text-sm font-bold text-foreground">
                  <Logo />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">FocusTube</span>
                  <span className="">v1.0.0</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="w-full" size="lg">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title} className="w-full">
                <SidebarMenuButton asChild className="w-full h-10">
                  <NavLink to={item.url} className="font-medium">
                    {item.title}
                  </NavLink>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={item.isActive}>
                          <Link to={item.url}>{item.title}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu size="lg">
          <SidebarMenuItem className="flex items-center">
            <Avatar className="mr-auto" size="xl">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            <SidebarMenuButton asChild>
              <Link
                className="h-11"
                to="/user/profile"
                rel="noopener noreferrer"
              >
                Profile
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
