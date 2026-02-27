import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { DataTable } from "./data-table";
import { SectionCards } from "./section-cards";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import data from "../app/dashboard/data.json";
import { getUserProfile } from "@/lib/users";

export default function Dashboard() {
  const { userId } = useParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setProfileError("Invalid user.");
        setIsLoadingProfile(false);
        return;
      }

      try {
        setProfileError("");
        setIsLoadingProfile(true);
        const response = await getUserProfile(userId);
        const profile = response?.data;
        setFullName(profile?.fullName || "");
        setEmail(profile?.email || "");
      } catch (error) {
        setProfileError(error.message || "Unable to load profile.");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [userId]);

  return (
    <SidebarProvider
    //   style={
    //     {
    //       "--sidebar-width": "calc(var(--spacing) * 72)",
    //       "--header-height": "calc(var(--spacing) * 12)",
    //     } as React.CSSProperties
    //   }
    >
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h2 className="text-xl font-semibold">
                  {isLoadingProfile
                    ? "Loading profile..."
                    : `Welcome, ${fullName || "User"}`}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {profileError || email || "No profile details available."}
                </p>
              </div>
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
  );
}
