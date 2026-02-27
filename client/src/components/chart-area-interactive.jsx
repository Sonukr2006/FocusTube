"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const RANGE_TO_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const toDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const buildDateRange = (days) => {
  const list = [];
  const now = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    list.push(toDateKey(date));
  }
  return list;
};

const parseTimestamp = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const chartConfig = {
  lecturesCompleted: {
    label: "Lecture Updates",
    color: "#f97316",
  },
  todosCompleted: {
    label: "Todo Updates",
    color: "#22c55e",
  },
  timerSessions: {
    label: "Timer Sessions",
    color: "#3b82f6",
  },
};

export function ChartAreaInteractive({
  sessionHistory = [],
  todos = [],
  timerAnalytics = {},
  isLoading = false,
}) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");
  const [todayDateKey] = React.useState(() => toDateKey(new Date()));

  React.useEffect(() => {
    if (isMobile) setTimeRange("30d");
  }, [isMobile]);

  const latestActivityDateKey = React.useMemo(() => {
    const candidates = [];

    sessionHistory.forEach((item) => {
      const timestamp = parseTimestamp(item?.updatedAt || item?.createdAt);
      if (timestamp) candidates.push(timestamp);
    });

    todos.forEach((item) => {
      const timestamp = parseTimestamp(item?.updatedAt || item?.createdAt);
      if (timestamp) candidates.push(timestamp);
    });

    Object.keys(timerAnalytics || {}).forEach((dateKey) => {
      const timestamp = parseTimestamp(dateKey);
      if (timestamp) candidates.push(timestamp);
    });

    const latestTs = candidates.length
      ? Math.max(...candidates)
      : parseTimestamp(todayDateKey);
    return toDateKey(new Date(latestTs));
  }, [sessionHistory, timerAnalytics, todayDateKey, todos]);

  const chartData = React.useMemo(() => {
    const days = RANGE_TO_DAYS[timeRange] || 90;
    const dateKeys = buildDateRange(days);
    const endDate =
      parseTimestamp(latestActivityDateKey) || parseTimestamp(todayDateKey);
    const anchoredDateKeys = dateKeys.map((_, index) => {
      const date = new Date(endDate);
      date.setDate(date.getDate() - (days - 1 - index));
      return toDateKey(date);
    });
    const chartMap = anchoredDateKeys.reduce((accumulator, dateKey) => {
      accumulator[dateKey] = {
        date: dateKey,
        lecturesCompleted: 0,
        todosCompleted: 0,
        timerSessions: 0,
      };
      return accumulator;
    }, {});

    sessionHistory.forEach((item) => {
      const dateKey = toDateKey(item.updatedAt || item.createdAt);
      if (!dateKey || !chartMap[dateKey]) return;
      chartMap[dateKey].lecturesCompleted += 1;
    });

    todos.forEach((item) => {
      const dateKey = toDateKey(item.updatedAt || item.createdAt);
      if (!dateKey || !chartMap[dateKey]) return;
      chartMap[dateKey].todosCompleted += 1;
    });

    Object.entries(timerAnalytics || {}).forEach(([dateKey, bucket]) => {
      if (!chartMap[dateKey]) return;
      const completedSessions = Math.max(
        0,
        Number(bucket?.completedSessions) || 0
      );
      const startedSessions = Math.max(0, Number(bucket?.startedSessions) || 0);
      chartMap[dateKey].timerSessions += completedSessions || startedSessions;
    });

    return anchoredDateKeys.reduce(
      (accumulator, key) => {
        const bucket = chartMap[key];
        const nextLectures =
          accumulator.runningLectures + bucket.lecturesCompleted;
        const nextTodos = accumulator.runningTodos + bucket.todosCompleted;
        const nextTimers = accumulator.runningTimers + bucket.timerSessions;

        accumulator.data.push({
          ...bucket,
          lecturesCompleted: nextLectures,
          todosCompleted: nextTodos,
          timerSessions: nextTimers,
        });

        return {
          runningLectures: nextLectures,
          runningTodos: nextTodos,
          runningTimers: nextTimers,
          data: accumulator.data,
        };
      },
      {
        runningLectures: 0,
        runningTodos: 0,
        runningTimers: 0,
        data: [],
      }
    ).data;
  }, [
    latestActivityDateKey,
    sessionHistory,
    timeRange,
    timerAnalytics,
    todayDateKey,
    todos,
  ]);

  const hasAnyData = React.useMemo(
    () =>
      chartData.some(
        (item) =>
          (Number(item.lecturesCompleted) || 0) > 0 ||
          (Number(item.todosCompleted) || 0) > 0 ||
          (Number(item.timerSessions) || 0) > 0
      ),
    [chartData]
  );

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Productivity Trend</CardTitle>
        <CardDescription>
          Lecture updates, todo updates, and timer usage by day.
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading chart data...</p>
        ) : !hasAnyData ? (
          <p className="text-sm text-muted-foreground">
            Selected range me activity nahi mili. Timer start karke ya todo/lecture complete
            karke graph auto-update hoga.
          </p>
        ) : null}
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillLectures" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-lecturesCompleted)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-lecturesCompleted)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillTodos" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-todosCompleted)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-todosCompleted)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillTimers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-timerSessions)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-timerSessions)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={24}
              domain={[0, "dataMax + 1"]}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="lecturesCompleted"
              type="stepAfter"
              fill="url(#fillLectures)"
              stroke="var(--color-lecturesCompleted)"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Area
              dataKey="todosCompleted"
              type="stepAfter"
              fill="url(#fillTodos)"
              stroke="var(--color-todosCompleted)"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Area
              dataKey="timerSessions"
              type="stepAfter"
              fill="url(#fillTimers)"
              stroke="var(--color-timerSessions)"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
