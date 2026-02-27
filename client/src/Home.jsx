import { AppSidebar } from "./components/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";
import { Separator } from "./components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Link, Outlet, useLocation } from "react-router";
import StudyTimer from "./components/StudyTimer";
export default function Home({children}) {
  const location = useLocation();
  const isHomePage = location.pathname === "/user" || location.pathname === "/user/";

  return (
    <SidebarProvider className="min-h-full">
      <AppSidebar className="top-14 h-[calc(100svh-3.5rem)]" />
      <SidebarInset className="min-h-full">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Link to="/user/profile" className="ml-auto" size="lg">
          <Avatar size="xl">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          </Link>
        </header> 
        <div className="flex flex-1 flex-col gap-4 p-4">
          {isHomePage ? <StudyTimer interactive /> : null}
          {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" /> */}
          {children || <Outlet />}
        </div>

        {!isHomePage ? (
          <div className="pointer-events-none fixed right-4 top-16 z-50 w-[min(300px,calc(100vw-2rem))]">
            <div className="pointer-events-auto">
              <StudyTimer interactive={false} compact />
            </div>
          </div>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
