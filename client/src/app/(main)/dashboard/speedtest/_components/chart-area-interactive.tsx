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
import { toast } from "sonner";
import { formatBytesToMbps, formatPrecision } from "./utils";

export namespace ChartAreaInteractive {
  export interface SpeedtestRecord {
    empty?: boolean;
    type: string;
    timestamp: string;
    ping: { jitter: number; latency: number; low: number; high: number };
    download: {
      bandwidth: number; bytes: number; elapsed: number;
      latency: { iqm: number; low: number; high: number; jitter: number };
    };
    upload: {
      bandwidth: number; bytes: number; elapsed: number;
      latency: { iqm: number; low: number; high: number; jitter: number };
    };
    packetLoss: number;
    isp: string;
    interface: { internalIp: string; name: string; macAddr: string; isVpn: boolean; externalIp: string };
    server: { id: number; host: string; port: number; name: string; location: string; country: string; ip: string };
    result: { id: string; persisted: boolean; url: string };
  }

  export type TimeRange = "7d" | "30d" | "90d";

  export type AggregatedPoint<T> = {
    date: string;
  } & T

  export interface SpeedPointFields {
    download: number;
    upload: number;
  }

  export interface LatencyPointFields {
    ping: number;
    jitter: number;
  }
}

const speedChartConfig = {
  visitors: { label: "Download & Upload speed" },
  download: { label: "Download", color: "var(--chart-1)" },
  upload: { label: "Upload", color: "var(--chart-2)" },
} satisfies ChartConfig;

const latencyChartConfig = {
  visitors: { label: "Ping & Jitter" },
  ping: { label: "Ping", color: "var(--chart-1)" },
  jitter: { label: "Jitter", color: "var(--chart-2)" },
} satisfies ChartConfig;

const MS_MIN = 60_000;
const MS10 = 10 * MS_MIN;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<ChartAreaInteractive.TimeRange>("90d");
  const [chartData, setChartData] = React.useState<ChartAreaInteractive.SpeedtestRecord[]>([]);

  React.useEffect(() => {
    const now = Date.now();
    const from = now - 90 * 24 * 60 * 60 * 1000;
    fetch(`/api/speedtest?from=${from}&to=${now}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : (toast.error("Failed to fetch", { richColors: true }), { data: [] })))
      .then((json) => setChartData(json.data));
  }, []);

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const floorTo10Minutes = React.useCallback((timestamp: number) => {
    const d = new Date(timestamp);
    d.setSeconds(0, 0);
    d.setMinutes(formatPrecision(d.getMinutes()));
    return d.getTime();
  }, []);

  const floorToHourStep = React.useCallback((timestamp: number, hoursStep: number) => {
    const d = new Date(timestamp);
    d.setMinutes(0, 0, 0);
    const hours = d.getHours();
    d.setHours(Math.floor(hours / hoursStep) * hoursStep);
    return d.getTime();
  }, []);

  const daysToSubtract = React.useMemo(
    () => (timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 90),
    [timeRange]
  );
  const groupHours = React.useMemo(
    () => (timeRange === "7d" ? 1 : timeRange === "30d" ? 4 : 12),
    [timeRange]
  );
  const groupMs = React.useMemo(() => groupHours * 60 * MS_MIN, [groupHours]);

  const nowTimestamp = React.useMemo(() => Date.now(), []);
  const startTimestamp = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - daysToSubtract);
    return d.getTime();
  }, [daysToSubtract]);

  const filteredSorted = React.useMemo(
    () =>
      chartData
        .filter((it) => new Date(it.timestamp).getTime() >= startTimestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [chartData, startTimestamp]
  );

  const maps = React.useMemo(() => {
    const speedMap = new Map<number, { download: number; upload: number }>();
    const latencyMap = new Map<number, { ping: number; jitter: number }>();

    for (const item of filteredSorted) {
      if (item.empty) continue;
      const bucketTimestamp = floorTo10Minutes(new Date(item.timestamp).getTime());
      if (!speedMap.has(bucketTimestamp)) {
        speedMap.set(bucketTimestamp, {
          download: formatBytesToMbps(item.download.bandwidth),
          upload: formatBytesToMbps(item.upload.bandwidth),
        });
      }
      if (!latencyMap.has(bucketTimestamp)) {
        latencyMap.set(bucketTimestamp, {
          ping: Math.round(item.ping.latency),
          jitter: Math.round(item.ping.jitter),
        });
      }
    }
    return { speedMap, latencyMap };
  }, [filteredSorted, floorTo10Minutes]);

  const formatAxisDate = React.useCallback(
    (value: string | number) =>
      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    []
  );

  const { speedData, latencyData } = React.useMemo(() => {
    const speedAggregated: Array<ChartAreaInteractive.AggregatedPoint<ChartAreaInteractive.SpeedPointFields>> = [];
    const latencyAggregated: Array<ChartAreaInteractive.AggregatedPoint<ChartAreaInteractive.LatencyPointFields>> = [];

    const rangeStart = floorToHourStep(startTimestamp, groupHours);
    const rangeEnd = floorToHourStep(nowTimestamp, groupHours);

    for (let g = rangeStart; g <= rangeEnd; g += groupMs) {
      let downloadSum = 0, uploadSum = 0, downloadCount = 0;
      let pingSum = 0, jitterSum = 0, latencyCount = 0;

      for (let t = g; t < g + groupMs && t <= rangeEnd + groupMs - MS10; t += MS10) {
        const speedEntry = maps.speedMap.get(t);
        if (speedEntry) {
          downloadSum += speedEntry.download;
          uploadSum += speedEntry.upload;
          downloadCount++;
        }
        const latencyEntry = maps.latencyMap.get(t);
        if (latencyEntry) {
          pingSum += latencyEntry.ping;
          jitterSum += latencyEntry.jitter;
          latencyCount++;
        }
      }

      speedAggregated.push({
        date: new Date(g).toISOString(),
        download: downloadCount > 0 ? formatPrecision(downloadSum / downloadCount) : 0,
        upload: downloadCount > 0 ? formatPrecision(uploadSum / downloadCount) : 0,
      });

      latencyAggregated.push({
        date: new Date(g).toISOString(),
        ping: latencyCount > 0 ? Math.round(pingSum / latencyCount) : 0,
        jitter: latencyCount > 0 ? Math.round(jitterSum / latencyCount) : 0,
      });
    }

    return { speedData: speedAggregated, latencyData: latencyAggregated };
  }, [maps, startTimestamp, nowTimestamp, groupHours, groupMs, floorToHourStep]);

  const handleRangeChange = React.useCallback((value: string) => {
    if (value === "7d" || value === "30d" || value === "90d") setTimeRange(value);
  }, []);

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
    <>
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Download & Upload speed</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">Results for the selected range</span>
            <span className="@[540px]/card:hidden">Selected range</span>
          </CardDescription>
          <CardAction>
            <RangeControls />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer config={speedChartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={speedData}>
              <defs>
                <linearGradient id="download" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#177aab" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="#2de5d1" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="upload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7026ad" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="#f371ff" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid />
              <CommonXAxis />
              {CommonTooltip()}
              <Area dataKey="download" type="monotone" fill="url(#download)" stroke="#6afff3" />
              <Area dataKey="upload" type="monotone" fill="url(#upload)" stroke="#bf71ff" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Ping & Jitter stats</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">Results for the selected range</span>
            <span className="@[540px]/card:hidden">Selected range</span>
          </CardDescription>
          <CardAction>
            <RangeControls />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer config={latencyChartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="ping" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--red-800)" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="var(--red-400)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="jitter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--amber-800)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--amber-400)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid />
              <CommonXAxis />
              {CommonTooltip(isMobile ? -1 : 10)}
              <Area dataKey="ping" type="monotone" fill="url(#ping)" stroke="var(--red-800)" />
              <Area dataKey="jitter" type="monotone" fill="url(#jitter)" stroke="var(--amber-800)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
