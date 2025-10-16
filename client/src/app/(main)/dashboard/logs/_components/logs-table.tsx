'use client'
import { Log } from '@/types/models/log'
import { Icon } from '@impactium/icons';
import s from './logs-table.module.css';
import { cn } from '@impactium/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export namespace LogsTable {
  export interface Props {
    logs: Log.Type[];
    totalCount?: number;
  }
}
function getStatus(status: number): string {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'redirect'
  if (status >= 400 && status < 500) return 'badRequest'
  if (status >= 500) return 'error'
  return 'unknown'
}

function parsePath(path: string): { domain: string; path: string } {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const url = new URL(path)
      return { domain: url.hostname, path: url.pathname + url.search }
    } catch {
      return { domain: '', path }
    }
  }

  return { domain: '', path }
}

export function LogsTable({ logs }: LogsTable.Props) {
  const getIcon = (log: Log.Type): Icon.Name => {
    if (log.path.includes('masons')) {
      return 'FunctionMiddleware'
    } else if (log.path.includes('/api')) {
      if (log.path.includes('/v1')) {
        return 'FunctionNest';
      } else if (log.path.includes('v2')) {
        return 'FunctionPython';
      } else {
        return 'FunctionGo';
      }
    }

    return 'FunctionSquare'
  }

  return (
    <Card className='@container/card gap-0! p-1 max-h-128 overflow-x-hidden overflow-y-auto'>
      {logs.map((log) => {
        const { domain, path } = parsePath(log.path)
        const status = getStatus(log.status);

        const date = new Date(log.timestamp);

        return (
          <div key={log.req_id} className={cn(`flex shrink-0 items-center h-8 rounded-md text-xs`, s.log, s[status])}>
            <div className='flex items-center gap-2 px-1.5 min-w-[128px]'>
              <span data-badge data-status>{log.status}</span>
              <span>{date.toLocaleTimeString() + ':' + date.getMilliseconds()}</span>
            </div>
            <div className='flex items-center gap-2 px-3 min-w-[128px] justify-start'>
              <span data-badge data-method>{log.method}</span>             
              <span>{date.toLocaleDateString()}</span>
            </div>
            <div className='flex items-center px-3 flex-1 min-w-0'>
              <Icon className='mr-2 shrink-0' name={getIcon(log)} color={status === 'error' ? 'var(--red-900)' : 'var(--gray-900)'} />
              <span className={`text-[var(--${status === 'error' ? 'red' : 'gray'}-1000)]! font-mono`}>{domain}</span>
              <span className='truncate font-mono'>{path}</span>
              {log.data && (
                <Button variant='link' size='icon-sm' className='h-3.5 w-3.5 rounded-[4] cursor-pointer ml-auto'><Icon className='size-3.5' name='Braces' /></Button>
              )}
            </div>
          </div>
        )
      })}
    </Card>
  )
}
