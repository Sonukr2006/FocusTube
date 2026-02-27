import { IconClockHour4, IconListCheck, IconPlayerPlay, IconVideo } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formatPercent = (value) => `${Math.max(0, Math.min(100, Number(value) || 0)).toFixed(1)}%`;

export function SectionCards({ metrics, isLoading = false }) {
  const safeMetrics = metrics || {
    lectureCompleted: 0,
    lectureTotal: 0,
    lectureCompletionRate: 0,
    todoCompleted: 0,
    todoTotal: 0,
    todoCompletionRate: 0,
    timerCompletedSessions: 0,
    timerCompletedMinutes: 0,
    timerStartedSessions: 0,
  };

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
        <CardHeader>
          <CardDescription>Lecture Completion</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? "Loading..." : formatPercent(safeMetrics.lectureCompletionRate)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconVideo />
              {safeMetrics.lectureCompleted}/{safeMetrics.lectureTotal || 0}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Completed playlists tracked
          </div>
          <div className="text-muted-foreground">
            Based on your saved session history.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
        <CardHeader>
          <CardDescription>Todo Completion</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? "Loading..." : formatPercent(safeMetrics.todoCompletionRate)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconListCheck />
              {safeMetrics.todoCompleted}/{safeMetrics.todoTotal || 0}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Completed todos in your account
          </div>
          <div className="text-muted-foreground">
            Live status from your todo list.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
        <CardHeader>
          <CardDescription>Focus Timer Usage</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading
              ? "Loading..."
              : `${Math.max(0, Number(safeMetrics.timerCompletedMinutes) || 0)} min`}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconClockHour4 />
              {safeMetrics.timerCompletedSessions} sessions
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Timer sessions completed <IconPlayerPlay className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Started: {safeMetrics.timerStartedSessions} sessions total.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
