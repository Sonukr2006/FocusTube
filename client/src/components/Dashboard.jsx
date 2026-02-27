import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { DataTable } from "./data-table";
import { SectionCards } from "./section-cards";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import data from "../app/dashboard/data.json";
import { getUserProfile } from "@/lib/users";
import { getSessionHistory } from "@/lib/sessionProgress";
import { Button } from "./ui/button";

export default function Dashboard() {
  const { userId } = useParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

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

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) {
        setHistory([]);
        setHistoryError("Invalid user.");
        setIsLoadingHistory(false);
        return;
      }

      try {
        setHistoryError("");
        setIsLoadingHistory(true);
        const response = await getSessionHistory(8);
        setHistory(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        setHistoryError(error.message || "Unable to load session history.");
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [userId]);

  const formatWatchTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds % 60;
    return `${minutes}m ${remaining}s`;
  };

  const formatUpdatedAt = (value) => {
    const timestamp = Date.parse(value || "");
    if (Number.isNaN(timestamp)) return "Unknown";
    return new Date(timestamp).toLocaleString();
  };

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
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Session History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoadingHistory ? (
                      <p className="text-sm text-muted-foreground">Loading history...</p>
                    ) : null}
                    {!isLoadingHistory && historyError ? (
                      <p className="text-sm text-destructive">{historyError}</p>
                    ) : null}
                    {!isLoadingHistory && !historyError && !history.length ? (
                      <p className="text-sm text-muted-foreground">
                        No session history yet. Start a playlist in Session tab.
                      </p>
                    ) : null}
                    {!isLoadingHistory && !historyError && history.length
                      ? history.map((item) => (
                          <div key={item.playlistId} className="rounded-md border p-3">
                            <p className="text-sm font-medium">
                              {item.playlistTitle || "YouTube Playlist"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Playlist ID: {item.playlistId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last video: {item.lastVideoTitle || item.videoId || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last position: {formatWatchTime(item.currentTimeSec)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Status: {item.isCompleted ? "Completed" : "In progress"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Updated: {formatUpdatedAt(item.updatedAt)}
                            </p>
                          </div>
                        ))
                      : null}
                      <div>
                        <Button  variant="outline" size="sm">Resume</Button>
                      </div>
                  </CardContent>
                </Card>
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
