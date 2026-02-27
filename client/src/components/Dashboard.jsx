
import { ChartAreaInteractive } from "./chart-area-interactive"
import { DataTable } from "./data-table"
import { SectionCards } from "./section-cards"
import { SiteHeader } from "./site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "./ui/sidebar"

import data from "../app/dashboard/data.json"
import { AppSidebar } from "./AppSidebar"

export default function Dashboard() {
  return (
    <SidebarProvider
    //   style={
    //     {
    //       "--sidebar-width": "calc(var(--spacing) * 72)",
    //       "--header-height": "calc(var(--spacing) * 12)",
    //     } as React.CSSProperties
    //   }
    >
      {/* <AppSidebar variant="inset" className="w-64" /> */}
      <SidebarInset>
        {/* <SiteHeader /> */}
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
