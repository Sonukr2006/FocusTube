import { useEffect, useRef, useState } from "react";
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
import { Link, Outlet, useLocation, useParams } from "react-router";
import StudyTimer from "./components/StudyTimer";
export default function Home({children}) {
  const location = useLocation();
  const { userId } = useParams();
  const userBasePath = userId ? `/user/${userId}` : "/user";
  const isHomePage =
    location.pathname === userBasePath || location.pathname === `${userBasePath}/`;
  const floatingTimerRef = useRef(null);
  const [floatingPosition, setFloatingPosition] = useState(null);
  const [dragOffset, setDragOffset] = useState(null);

  const clampFloatingPosition = (x, y) => {
    const margin = 8;
    const timerWidth = Math.min(300, window.innerWidth - 32);
    const timerHeight = floatingTimerRef.current?.offsetHeight || 280;
    const maxX = Math.max(margin, window.innerWidth - timerWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - timerHeight - margin);

    return {
      x: Math.min(Math.max(x, margin), maxX),
      y: Math.min(Math.max(y, margin), maxY),
    };
  };

  const startDragging = (clientX, clientY) => {
    if (!floatingTimerRef.current) return;

    const rect = floatingTimerRef.current.getBoundingClientRect();
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleDragStartMouse = (event) => {
    event.preventDefault();
    startDragging(event.clientX, event.clientY);
  };

  const handleDragStartTouch = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    startDragging(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    if (isHomePage || floatingPosition) return;

    const defaultX = Math.max(8, window.innerWidth - Math.min(300, window.innerWidth - 32) - 16);
    const defaultY = 64;
    setFloatingPosition(clampFloatingPosition(defaultX, defaultY));
  }, [isHomePage, floatingPosition]);

  useEffect(() => {
    if (!dragOffset) return undefined;

    const handleMouseMove = (event) => {
      const nextPosition = clampFloatingPosition(
        event.clientX - dragOffset.x,
        event.clientY - dragOffset.y
      );
      setFloatingPosition(nextPosition);
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      const nextPosition = clampFloatingPosition(
        touch.clientX - dragOffset.x,
        touch.clientY - dragOffset.y
      );
      setFloatingPosition(nextPosition);
    };

    const stopDragging = () => setDragOffset(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDragging);
    };
  }, [dragOffset]);

  useEffect(() => {
    if (!floatingPosition) return undefined;

    const handleResize = () => {
      setFloatingPosition((previous) =>
        previous ? clampFloatingPosition(previous.x, previous.y) : previous
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [floatingPosition]);

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
          <Link to={`${userBasePath}/profile`} className="ml-auto" size="lg">
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
          <div
            ref={floatingTimerRef}
            className="fixed z-50 w-[min(300px,calc(100vw-2rem))]"
            style={
              floatingPosition
                ? {
                    left: `${floatingPosition.x}px`,
                    top: `${floatingPosition.y}px`,
                  }
                : { right: "1rem", top: "4rem" }
            }
          >
            <div
              className="mb-1 cursor-move select-none rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm"
              onMouseDown={handleDragStartMouse}
              onTouchStart={handleDragStartTouch}
            >
              Drag timer
            </div>
            <StudyTimer interactive={false} compact />
          </div>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
