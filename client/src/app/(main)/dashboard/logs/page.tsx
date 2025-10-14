import { Log } from "@/types/models/log";
import { LogsTable } from "./_components/logs-table";
import { LogsCards } from "./_components/logs-cards";
import { LogsChart } from "./_components/logs-chart";
import { Authorization, SERVER } from "../../../../../constraints";
import { cookies } from "next/headers";

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
  .catch(() => []) || [];

  const stats = await fetch(`http://${SERVER}/api/logs/stats`, {
    headers: {
      [Authorization]: authorization.value
    },
    next: {
      tags: ['logs_stats']
    }
  })
  .then((res) => res.ok ? res.json().then(p => p.data) : [])
  .catch(() => []) || [];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <LogsCards />
      <LogsChart stats={stats} />
      <LogsTable logs={logs} />
    </div>
  );
}
