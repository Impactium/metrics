'use client'

import { Log } from "@/types/models/log";
import { LogsTable } from "./logs-table";
import { LogsChart } from "./logs-chart";
import { useEffect, useState, useRef } from "react";
import { between } from "@impactium/utils";
import { SERVER_CSR } from "../../../../../../constraints";
import { LogsCards } from "./logs-cards";

export namespace LogsPageClient {
  export interface Props {
    initialLogs: Log.Type[];
    initialStats: Log.Statistics.Type;
    initialTranding: LogsCards.Trending;
  }
}

export function LogsPageClient({ initialLogs, initialStats, initialTranding }: LogsPageClient.Props) {
  const [logs, setLogs] = useState<Log.Type[]>(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const [tranding, setTranding] = useState(initialTranding);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    let alive = true;
    let attempt = 0;
    const MAX_BACKOFF = 10_000;

    const connect = () => {
      const ws = new WebSocket(`${SERVER_CSR}/api/ws`);
      socket.current = ws;

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (m) => {
        let log: Log.Type;
        try {
          log = JSON.parse(m.data);
        } catch {
          return;
        }

        const key: Log.Statistics.Key =
          between(log.status, 200, 299)
            ? 'success'
            : between(log.status, 300, 399)
              ? 'redirect'
              : between(log.status, 400, 499)
                ? 'badRequest'
                : between(log.status, 500, 599)
                  ? 'error'
                  : 'provisional';

        setStats((prev) => {
          if (!prev.length) return prev;
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last[key] = (last[key] ?? 0) + 1;
          next[next.length - 1] = last;
          return next;
        });

        setLogs((prev) => {
          const next = [...prev, log]
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-256);
          return next;
        });

        setTranding((prev) => {
          const is5xx = log.status >= 500 && log.status <= 599;
          return {
            ...prev,
            errors: {
              ...prev.errors,
              total: prev.errors.total + (is5xx ? 1 : 0),
              last: prev.errors.last + (is5xx ? 1 : 0),
            },
            all: {
              ...prev.all,
              total: prev.all.total + 1,
              last: prev.all.last + 1,
            },
          };
        });
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        socket.current = null;
        if (!alive) return;
        const delay = Math.min(MAX_BACKOFF, 250 * 2 ** attempt++);
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      alive = false;
      socket.current?.close();
      socket.current = null;
    };
  }, []);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <LogsCards tranding={tranding} />
      <LogsChart stats={stats} />
      <LogsTable logs={logs} />
    </div>
  );
}

