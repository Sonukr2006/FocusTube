import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { DataTable } from "./data-table";
import { SectionCards } from "./section-cards";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getUserProfile } from "@/lib/users";
import { loadTimerAnalytics } from "@/lib/timerAnalytics";
import { Button } from "./ui/button";
import { useDispatch, useSelector } from "react-redux";
import { selectCurrentUser } from "@/store/slices/authSlice";
import { fetchTodosThunk, selectTodosState } from "@/store/slices/todosSlice";
import {
  fetchSessionHistoryThunk,
  selectSessionHistory,
  selectSessionHistoryError,
  selectSessionHistoryLoading,
} from "@/store/slices/sessionsSlice";

export default function Dashboard() {
  const dispatch = useDispatch();
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const history = useSelector(selectSessionHistory);
  const isLoadingHistory = useSelector(selectSessionHistoryLoading);
  const historyError = useSelector(selectSessionHistoryError);
  const { items: todos, isLoading: isLoadingTodos, error: todoError } =
    useSelector(selectTodosState);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [timerAnalytics, setTimerAnalytics] = useState({});

  const authenticatedUserId = currentUser?._id ? String(currentUser._id) : "";
  const routeUserId = userId ? String(userId) : "";
  const isValidUserSession =
    Boolean(authenticatedUserId) && Boolean(routeUserId) && authenticatedUserId === routeUserId;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isValidUserSession) {
        setProfileError("Invalid user session. Please login again.");
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
  }, [isValidUserSession, userId]);

  useEffect(() => {
    if (!isValidUserSession) return;
    dispatch(fetchSessionHistoryThunk(50));
    dispatch(fetchTodosThunk());
  }, [dispatch, isValidUserSession]);

  useEffect(() => {
    if (!authenticatedUserId || !isValidUserSession) {
      setTimerAnalytics({});
      return;
    }

    const syncTimerAnalytics = () => {
      setTimerAnalytics(loadTimerAnalytics(authenticatedUserId));
    };

    syncTimerAnalytics();

    const handleAnalyticsUpdate = (event) => {
      const eventUserId = event?.detail?.userId ? String(event.detail.userId) : "";
      if (eventUserId && eventUserId !== authenticatedUserId) return;
      syncTimerAnalytics();
    };

    window.addEventListener(
      "focustube:timer-analytics-updated",
      handleAnalyticsUpdate
    );
    window.addEventListener("storage", syncTimerAnalytics);

    return () => {
      window.removeEventListener(
        "focustube:timer-analytics-updated",
        handleAnalyticsUpdate
      );
      window.removeEventListener("storage", syncTimerAnalytics);
    };
  }, [authenticatedUserId, isValidUserSession]);

  const dashboardMetrics = useMemo(() => {
    const lectureTotal = history.length;
    const lectureCompleted = history.filter((item) => item?.isCompleted).length;
    const lectureCompletionRate = lectureTotal
      ? (lectureCompleted / lectureTotal) * 100
      : 0;

    const todoTotal = todos.length;
    const todoCompleted = todos.filter((item) => item?.completed).length;
    const todoCompletionRate = todoTotal ? (todoCompleted / todoTotal) * 100 : 0;

    const timerSummary = Object.values(timerAnalytics || {}).reduce(
      (accumulator, bucket) => ({
        timerStartedSessions:
          accumulator.timerStartedSessions +
          Math.max(0, Number(bucket?.startedSessions) || 0),
        timerCompletedSessions:
          accumulator.timerCompletedSessions +
          Math.max(0, Number(bucket?.completedSessions) || 0),
        timerCompletedMinutes:
          accumulator.timerCompletedMinutes +
          Math.max(0, Number(bucket?.completedMinutes) || 0),
      }),
      {
        timerStartedSessions: 0,
        timerCompletedSessions: 0,
        timerCompletedMinutes: 0,
      }
    );

    return {
      lectureCompleted,
      lectureTotal,
      lectureCompletionRate,
      todoCompleted,
      todoTotal,
      todoCompletionRate,
      timerStartedSessions: timerSummary.timerStartedSessions,
      timerCompletedSessions: timerSummary.timerCompletedSessions,
      timerCompletedMinutes: timerSummary.timerCompletedMinutes,
    };
  }, [history, timerAnalytics, todos]);

  const outlineTodoRows = useMemo(() => {
    if (!isValidUserSession) return [];

    return (todos || []).map((todo, index) => {
      const createdDate = Date.parse(todo?.createdAt || "")
        ? new Date(todo.createdAt).toLocaleDateString()
        : "-";

      return {
        id: todo?._id || `todo-${index + 1}`,
        header: todo?.title || "Untitled todo",
        type: "Todo",
        status: todo?.completed ? "Done" : "In Process",
        target: createdDate,
        limit: todo?.description?.trim() || "-",
        reviewer: "Self",
      };
    });
  }, [isValidUserSession, todos]);

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

  const recentHistory = history.slice(0, 8);

  const handleResumeSession = (item) => {
    if (!isValidUserSession || !item?.playlistId) {
      alert("Invalid user session. Please login again.");
      return;
    }

    const ownerUserId = item?.userId ? String(item.userId) : "";
    if (ownerUserId && ownerUserId !== routeUserId) {
      alert("You cannot resume a playlist saved by another user.");
      return;
    }

    navigate(`/user/${encodeURIComponent(routeUserId)}/sessions`, {
      state: {
        resumeSession: {
          playlistId: item.playlistId,
          playlistTitle: item.playlistTitle || "",
          videoId: item.videoId || "",
          lastVideoTitle: item.lastVideoTitle || "",
          videoIndex: Math.max(0, Number(item.videoIndex) || 0),
          currentTimeSec: Math.max(0, Number(item.currentTimeSec) || 0),
          isCompleted: Boolean(item.isCompleted),
          ownerUserId,
          ownerUserEmail: item?.userEmail || "",
          updatedAt: item?.updatedAt || "",
        },
      },
    });
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
                      <p className="text-sm text-muted-foreground">
                        Loading history...
                      </p>
                    ) : null}
                    {!isLoadingHistory && historyError ? (
                      <p className="text-sm text-destructive">{historyError}</p>
                    ) : null}
                    {!isLoadingHistory && !historyError && !history.length ? (
                      <p className="text-sm text-muted-foreground">
                        No session history yet. Start a playlist in Session tab.
                      </p>
                    ) : null}
                    {!isLoadingHistory && !historyError && recentHistory.length
                      ? recentHistory.map((item) => {
                          const ownerUserId = item?.userId ? String(item.userId) : "";
                          const isOwnerMatch = !ownerUserId || ownerUserId === routeUserId;

                          return (
                            <div
                              key={item.playlistId}
                              className="rounded-md border p-3"
                            >
                            <p className="text-sm font-medium">
                              {item.playlistTitle || "YouTube Playlist"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Saved by: {item.userEmail || email || "Unknown user"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Playlist ID: {item.playlistId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last video:{" "}
                              {item.lastVideoTitle || item.videoId || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last position:{" "}
                              {formatWatchTime(item.currentTimeSec)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Status:{" "}
                              {item.isCompleted ? "Completed" : "In progress"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Updated: {formatUpdatedAt(item.updatedAt)}
                            </p>
                            <div className="m-3">
                              <Button
                                onClick={() => handleResumeSession(item)}
                                variant="outline"
                                size="sm"
                                disabled={!isOwnerMatch}
                              >
                                {isOwnerMatch ? "Resume" : "Not your playlist"}
                              </Button>
                            </div>
                          </div>
                        );
                        })
                      : null}
                  </CardContent>
                </Card>
              </div>
              {todoError ? (
                <div className="px-4 lg:px-6">
                  <p className="text-sm text-destructive">{todoError}</p>
                </div>
              ) : null}
              <SectionCards
                metrics={dashboardMetrics}
                isLoading={isLoadingHistory || isLoadingTodos}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive
                  sessionHistory={history}
                  todos={todos}
                  timerAnalytics={timerAnalytics}
                  isLoading={isLoadingHistory || isLoadingTodos}
                />
              </div>
              <DataTable data={outlineTodoRows} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
