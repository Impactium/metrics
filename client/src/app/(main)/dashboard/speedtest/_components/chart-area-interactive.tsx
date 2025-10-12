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

export namespace Speedtest {
  export interface Type {
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
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("90d");
  const [chartData, setChartData] = React.useState<Speedtest.Type[]>([]);

  React.useEffect(() => {
    fetch(`/api/speedtest?from=${Date.now() - 90 * 24 * 60 * 60 * 1000}&to=${Date.now()}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : (toast.error("Failed to fetch", { richColors: true }), { data: [] })))
      .then((json) => setChartData(json.data));
  }, []);

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const floorTo10m = React.useCallback((ts: number) => {
    const d = new Date(ts);
    d.setSeconds(0, 0);
    d.setMinutes(Math.floor(d.getMinutes() / 10) * 10);
    return d.getTime();
  }, []);

  const floorToHourStep = React.useCallback((ts: number, hoursStep: number) => {
    const d = new Date(ts);
    d.setMinutes(0, 0, 0);
    const hours = d.getHours();
    d.setHours(Math.floor(hours / hoursStep) * hoursStep);
    return d.getTime();
  }, []);

  const daysToSubtract = React.useMemo(() => (timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 90), [timeRange]);
  const groupHours = React.useMemo(() => (timeRange === "7d" ? 4 : timeRange === "30d" ? 24 : 48), [timeRange]);
  const groupMs = React.useMemo(() => groupHours * 60 * MS_MIN, [groupHours]);

  const nowTs = React.useMemo(() => Date.now(), []);
  const startTs = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - daysToSubtract);
    return d.getTime();
  }, [daysToSubtract]);

  const filteredSorted = React.useMemo(
    () =>
      chartData
        .filter((it) => new Date(it.timestamp).getTime() >= startTs)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [chartData, startTs]
  );

  const maps = React.useMemo(() => {
    const speedMap = new Map<number, { download: number; upload: number }>();
    const latencyMap = new Map<number, { ping: number; jitter: number }>();

    for (const item of filteredSorted) {
      if (item.empty) continue;
      const bucketTs = floorTo10m(new Date(item.timestamp).getTime());
      if (!speedMap.has(bucketTs)) {
        speedMap.set(bucketTs, {
          // keep numbers, not strings
          download: Math.round(((item.download.bandwidth * 8) / 1_000_000) * 10) / 10,
          upload: Math.round(((item.upload.bandwidth * 8) / 1_000_000) * 10) / 10,
        });
      }
      if (!latencyMap.has(bucketTs)) {
        latencyMap.set(bucketTs, {
          ping: Math.round(item.ping.latency),
          jitter: Math.round(item.ping.jitter),
        });
      }
    }
    return { speedMap, latencyMap };
  }, [filteredSorted, floorTo10m]);

  const { speedData, latencyData } = React.useMemo(() => {
    const speedAgg: Array<{ date: string; download: number; upload: number }> = [];
    const latencyAgg: Array<{ date: string; ping: number; jitter: number }> = [];

    const rangeStart = floorToHourStep(startTs, groupHours);
    const rangeEnd = floorToHourStep(nowTs, groupHours);

    for (let g = rangeStart; g <= rangeEnd; g += groupMs) {
      let dSum = 0,
        uSum = 0,
        dCnt = 0;
      let pSum = 0,
        jSum = 0,
        lCnt = 0;

      for (let t = g; t < g + groupMs && t <= rangeEnd + groupMs - MS10; t += MS10) {
        const s = maps.speedMap.get(t);
        if (s) {
          dSum += s.download;
          uSum += s.upload;
          dCnt++;
        }
        const l = maps.latencyMap.get(t);
        if (l) {
          pSum += l.ping;
          jSum += l.jitter;
          lCnt++;
        }
      }

      speedAgg.push({
        date: new Date(g).toISOString(),
        download: dCnt > 0 ? Math.round((dSum / dCnt) * 10) / 10 : 0,
        upload: dCnt > 0 ? Math.round((uSum / dCnt) * 10) / 10 : 0,
      });

      latencyAgg.push({
        date: new Date(g).toISOString(),
        ping: lCnt > 0 ? Math.round(pSum / lCnt) : 0,
        jitter: lCnt > 0 ? Math.round(jSum / lCnt) : 0,
      });
    }

    return { speedData: speedAgg, latencyData: latencyAgg };
  }, [maps, startTs, nowTs, groupHours, groupMs, floorToHourStep]);

  const handleRangeChange = React.useCallback((v: string) => {
    if (v === "7d" || v === "30d" || v === "90d") setTimeRange(v);
  }, []);

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
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    indicator="dot"
                  />
                }
              />
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
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
              />
              <ChartTooltip
                defaultIndex={isMobile ? -1 : 10}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area dataKey="ping" type="monotone" fill="url(#ping)" stroke="var(--red-800)" />
              <Area dataKey="jitter" type="monotone" fill="url(#jitter)" stroke="var(--amber-800)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
