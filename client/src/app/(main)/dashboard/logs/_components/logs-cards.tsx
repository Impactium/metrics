'server-only'
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@impactium/icons';
import { cookies } from 'next/headers';
import { Authorization, SERVER } from '../../../../../../constraints';

export namespace LogsCards {
  export interface Trending {
    all: {
      total: number;
      last: number
    };
    errors: {
      total: number;
      last: number
    };
  }
}

export async function LogsCards() {
  const cookieStore = await cookies();
  const authorization = cookieStore.get(Authorization);
  if (!authorization) return null;

  const result: LogsCards.Trending = await fetch(`http://${SERVER}/api/logs/count`, {
    headers: {
      [Authorization]: authorization.value
    },
    next: {
      tags: ['logs_count']
    }
  })
  .then((res) => res.ok ? res.json().then(p => p.data) : { total: 0, last: 0 })
  .catch(() => ({ total: 0, last: 0 }));

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-2">
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Total requests</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{result.all.total}</CardTitle>
          <CardAction>
            <Badge style={{ background: 'var(--green-200)', color: 'var(--green-900)' }}>
              <Icon name='TrendingUp' />
              +{result.all.last} during last 24 hours
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {result.all.total} requests during all the times <Icon name='TrendingUp' className='size-4' />
          </div>
          <div className='text-muted-foreground'>Total requests for the whole period</div>
        </CardFooter>
      </Card>
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Errors</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{result.errors.total}</CardTitle>
          <CardAction>
            <Badge style={{ background: 'var(--red-200)', color: 'var(--red-900)' }}>
              <Icon name='TrendingUp' />
              +{result.errors.last} during last 24 hours
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {result.errors.total} errors during all the times <Icon name='TrendingUp' className='size-4' />
          </div>
          <div className='text-muted-foreground'>Total errors for the whole period</div>
        </CardFooter>
      </Card>
    </div>
  );
}
