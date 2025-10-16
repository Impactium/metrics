'use client'

import { Log } from "@/types/models/log";
import { LogsTable } from "./logs-table";
import { LogsChart } from "./logs-chart";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SERVER_CSR, {
      path: '/api/ws/',
      withCredentials: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('log', (log: Log.Type) => {
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

        ++stats[stats.length - 1][key];

        return stats;
      });

      setLogs(logs => [log, ...logs].slice(0, 256).sort((a, b) => a.timestamp - b.timestamp));
      setTranding(tranding => {
        if (between(log.status, 400, 599)) {
          tranding.errors.total++;
          tranding.errors.last++;
        }
        tranding.all.total++;
        tranding.all.last++;

        return tranding;
      })
    });

    return () => {
      socket.disconnect();
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

