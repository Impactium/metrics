"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

export namespace LogsChart {
  export type TimeRange = "7d" | "30d" | "90d";

  export type StatusKey = "success" | "redirect" | "badRequest" | "error";

  export interface Point extends Record<StatusKey, number> {
    date: number; // ms
  }

  export type Stats = Point[];

  export interface Props {
    stats: Stats;
  }
}

const requestsChartConfig = {
  label: { label: "Requests" },
  success: { label: "Success", color: "var(--green-900)" },
  redirect: { label: "Redirect", color: "var(--blue-900)" },
  badRequest: { label: "Bad Request", color: "var(--amber-900)" },
  error: { label: "Error", color: "var(--red-900)" },
} satisfies ChartConfig;

const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

const TIME_RANGE_TO_DURATION_MS: Record<LogsChart.TimeRange, number> = {
  "7d": 7 * MS_DAY,
  "30d": 30 * MS_DAY,
  "90d": 90 * MS_DAY,
};

const TIME_RANGE_TO_BUCKET_MS: Record<LogsChart.TimeRange, number> = {
  "7d": 1 * MS_HOUR,
  "30d": 4 * MS_HOUR,
  "90d": 12 * MS_HOUR,
};

function zeroPoint(date: number): LogsChart.Point {
  return { date, success: 0, redirect: 0, badRequest: 0, error: 0 };
}

export function LogsChart({ stats }: LogsChart.Props) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<LogsChart.TimeRange>("90d");

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const handleRangeChange = React.useCallback((value: string) => {
    if (value === "7d" || value === "30d" || value === "90d") setTimeRange(value);
  }, []);

  const formatAxisDate = React.useCallback(
    (value: string | number) =>
      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    []
  );

  // Агрегация по новому типу: объединение записей в бакеты 7/1ч, 30/4ч, 90/12ч
  const chartData = React.useMemo<LogsChart.Stats>(() => {
    const now = Date.now();
    const rangeDuration = TIME_RANGE_TO_DURATION_MS[timeRange];
    const bucketSize = TIME_RANGE_TO_BUCKET_MS[timeRange];
    const rangeStart = now - rangeDuration;

    // фильтрация по диапазону
    const filtered = (stats ?? []).filter(
      (x): x is LogsChart.Point =>
        !!x && typeof x.date === "number" && x.date >= rangeStart && x.date <= now
    );

    // агрегация по бакетам
    const buckets = new Map<number, LogsChart.Point>();
    for (const p of filtered) {
      const t = Math.floor(p.date / bucketSize) * bucketSize;
      const acc = buckets.get(t) ?? zeroPoint(t);
      acc.success += p.success | 0;
      acc.redirect += p.redirect | 0;
      acc.badRequest += p.badRequest | 0;
      acc.error += p.error | 0;
      buckets.set(t, acc);
    }

    // заполнение пустых бакетов
    const firstBucket = Math.floor(rangeStart / bucketSize) * bucketSize;
    for (let t = firstBucket; t <= now; t += bucketSize) {
      if (!buckets.has(t)) buckets.set(t, zeroPoint(t));
    }

    // сортировка и вывод
    return Array.from(buckets.keys())
      .sort((a, b) => a - b)
      .map((t) => buckets.get(t)!);
  }, [stats, timeRange]);

  const RangeControls = React.useCallback(
    () => (
      <>
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={handleRangeChange}
          variant="outline"
          className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
        >
          <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
          <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
          <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
        </ToggleGroup>
        <Select value={timeRange} onValueChange={handleRangeChange}>
          <SelectTrigger
            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
            size="sm"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </>
    ),
    [timeRange, handleRangeChange]
  );

  const CommonXAxis = React.useCallback(
    () => (
      <XAxis
        dataKey="date"
        tickLine={false}
        tickMargin={8}
        minTickGap={32}
        tickFormatter={formatAxisDate}
      />
    ),
    [formatAxisDate]
  );

  const CommonTooltip = React.useCallback(
    (defaultIndex?: number) => (
      <ChartTooltip
        {...(typeof defaultIndex === "number" ? { defaultIndex } : {})}
        cursor={false}
        content={
          <ChartTooltipContent
            labelFormatter={formatAxisDate}
            indicator="dot"
          />
        }
      />
    ),
    [formatAxisDate]
  );

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total requests grouped by status</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Results for the selected range</span>
          <span className="@[540px]/card:hidden">Selected range</span>
        </CardDescription>
        <CardAction>
          <RangeControls />
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={requestsChartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="success" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor='var(--green-400)' stopOpacity={1.0} />
                <stop offset="95%" stopColor='var(--green-100)' stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="redirect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor='var(--blue-400)' stopOpacity={1.0} />
                <stop offset="95%" stopColor='var(--blue-100)' stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="badRequest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor='var(--amber-400)' stopOpacity={1.0} />
                <stop offset="95%" stopColor='var(--amber-100)' stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="error" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor='var(--red-400)' stopOpacity={1.0} />
                <stop offset="95%" stopColor='var(--red-100)' stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid />
            <CommonXAxis />
            {CommonTooltip()}
            <Area dataKey="success" type="monotone" fill="url(#success)" stroke='var(--green-900)' />
            <Area dataKey="redirect" type="monotone" fill="url(#redirect)" stroke='var(--blue-900)' />
            <Area dataKey="badRequest" type="monotone" fill="url(#badRequest)" stroke='var(--amber-900)' />
            <Area dataKey="error" type="monotone" fill="url(#error)" stroke='var(--red-900)' />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
