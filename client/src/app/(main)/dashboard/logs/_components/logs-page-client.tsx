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
    const ws = new WebSocket(SERVER_CSR + '/api/ws');

    socket.current = ws;

    
      try {
        ws.onmessage = m => {
          const log: Log.Type = JSON.parse(m.data);
          setStats(stats => {
            let key: Log.Statistics.Key = 'provisional';
            switch (true) {
              case between(log.status, 200, 299):
                key = 'success';
                break;
              case between(log.status, 300, 399):
                key = 'redirect';
                break;
              case between(log.status, 400, 499):
                key = 'badRequest';
                break;
              case between(log.status, 500, 599):
                key = 'error';
                break;
            }

            stats[stats.length - 1][key] += stats[stats.length - 1][key];

            return stats;
          });

          setLogs(logs => [log, ...logs].slice(0, 256).sort((a, b) => a.timestamp - b.timestamp));
          setTranding(tranding => {
            if (between(log.status, 500, 599)) {
              tranding.errors.total++;
              tranding.errors.last++;
            }
            tranding.all.total++;
            tranding.all.last++;

            return tranding;
          })
        };
      } catch (_) { }

    return () => {
      socket.current?.close()
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

