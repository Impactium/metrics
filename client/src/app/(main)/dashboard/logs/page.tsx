'server-only'
import { Authorization, SERVER_SSR } from "../../../../../constraints";
import { cookies } from "next/headers";
import { LogsPageClient } from "./_components/logs-page-client";
import { LogsCards } from "./_components/logs-cards";

export default async function () {
  const cookieStore = await cookies();
  const authorization = cookieStore.get(Authorization);
  if (!authorization) return null;

  const logs = await fetch(`http://${SERVER_SSR}/api/logs?limit=1024`, {
    headers: {
      [Authorization]: authorization.value
    },
    next: {
      tags: ['logs_list']
    }
  })
  .then((res) => res.ok ? res.json().then(p => p.data) : [])
  .catch(() => []) || [];

  const stats = await fetch(`http://${SERVER_SSR}/api/logs/stats`, {
    headers: {
      [Authorization]: authorization.value
    },
    next: {
      tags: ['logs_stats']
    }
  })
  .then((res) => res.ok ? res.json().then(p => p.data) : [])
  .catch(() => []) || [];

  const tranding = await fetch(`http://${SERVER_SSR}/api/logs/count`, {
    headers: {
      [Authorization]: authorization.value
    },
    next: {
      tags: ['logs_count']
    }
  })
  .then((res) => res.ok ? res.json().then(p => p.data) : null)
  .catch(() => null);

  return <LogsPageClient initialLogs={logs} initialStats={stats} initialTranding={tranding} />;
}
