import { useState } from "react";
import { LogOut } from "lucide-react";

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
import { Link, NavLink, useNavigate, useParams } from "react-router";
import { useDispatch } from "react-redux";
import Logo from "@/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { logoutUser } from "@/store/slices/authSlice";
import { clearTodosState } from "@/store/slices/todosSlice";
import { clearSessionState } from "@/store/slices/sessionsSlice";
import { ACTIVE_SESSION_VIDEO_STORAGE_KEY } from "@/lib/activeSessionVideo";

export function AppSidebar({ ...props }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false);
  const userBasePath = userId ? `/user/${userId}` : "/user";

  const confirmLogout = () => {
    dispatch(clearTodosState());
    dispatch(clearSessionState());
    dispatch(logoutUser());
    window.localStorage.removeItem(ACTIVE_SESSION_VIDEO_STORAGE_KEY);
    setIsLogoutPopupOpen(false);
    navigate("/login", { replace: true });
  };

  const data = {
    navMain: [
      {
        title: "Home",
        url: userBasePath,
      },
      {
        title: "Blocker",
        url: `${userBasePath}/blocker`,
      },
      {
        title: "Sessions",
        url: `${userBasePath}/sessions`,
      },
      {
        title: "Murmure",
        url: `${userBasePath}/soft-murmure`,
      },
      // {
      //   title: "Gemestream",
      //   url: `${userBasePath}/gemestream`,
      // },
      {
        title: "Ask ",
        url: `${userBasePath}/bot`,
      },
      {
        title: "Dashboard",
        url: `${userBasePath}/profile`,
      },
    ],
  };

  return (
    <>
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
                to={`${userBasePath}/profile`}
                rel="noopener noreferrer"
              >
                Profile
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsLogoutPopupOpen(true)}
              className="h-11"
            >
              <LogOut className="mr-1 size-4" />
              Logout
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      </Sidebar>

      {isLogoutPopupOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">
              Confirm Logout
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to logout from FocusTube?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLogoutPopupOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
