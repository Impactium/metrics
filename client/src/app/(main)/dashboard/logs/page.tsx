import { Log } from "@/types/models/log";
import { LogsTable } from "./_components/logs-table";
import { LogsCards } from "./_components/logs-cards";
import { LogsChart } from "./_components/logs-chart";
import { Authorization, SERVER } from "../../../../../constraints";
import { cookies } from "next/headers";

const logs: Log.Type[] = [
  {
    req_id: "1",
    timestamp: Date.now() - 3000,
    status: 200,
    took: 1118,
    path: "http://chicken-official.fun/index.html",
    method: "GET",
  },
  {
    req_id: "2",
    timestamp: Date.now() - 2000,
    status: 300,
    took: 318,
    path: "https://impactium.dev/api/application/info",
    method: "GET",
    data: '{"user": "test"}',
  },
  {
    req_id: "3",
    timestamp: Date.now() - 1000,
    status: 400,
    took: 1,
    path: "https://metrics.impactium.dev/api/v2/ping",
    method: "GET",
  },
  {
    req_id: "4",
    timestamp: Date.now() - 500,
    status: 504,
    took: 12,
    path: "https://inspector.impactium.dev/api/v1/deployment/new",
    method: "GET",
  },
  {
    req_id: "5",
    timestamp: Date.now(),
    status: 200,
    took: 98,
    path: "https://masons.partners/favicon.ico",
    method: "GET",
  }
]

export default async function () {
  const cookieStore = await cookies();
  const authorization = cookieStore.get(Authorization);
  if (!authorization) return null;

  const logs = await fetch(`http://${SERVER}/api/logs`, {
    headers: {
      [Authorization]: authorization.value
    },
    next: {
      tags: ['logs_list']
    }
  })
  .then((res) => res.ok ? res.json().then(p => p.data) : [])
  .catch(() => []);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <LogsCards />
      <LogsChart logs={logs} />
      <LogsTable logs={logs} />
    </div>
  );
}
