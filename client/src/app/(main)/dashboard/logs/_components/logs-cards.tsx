import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@impactium/icons';
import { useEffect, useState } from 'react';

export namespace LogsCards {
  export interface Props {
    tranding: Trending | null;
  }

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

export function LogsCards({ tranding: initialTranding }: LogsCards.Props) {
  const [tranding, setResult] = useState<LogsCards.Trending | null>(initialTranding);

  useEffect(() => {
    if (tranding) {
      return;
    }

    fetch(`/api/logs/count`, {
      credentials: 'include',
      next: {
        tags: ['logs_count']
      }
    })
    .then((res) => res.ok ? res.json().then(p => setResult(p.data)) : null)
    .catch(() => null);
  }, [])
  
  if (!tranding) {
    return null;
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-2">
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Total requests</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{tranding.all.total}</CardTitle>
          <CardAction>
            <Badge style={{ background: 'var(--green-200)', color: 'var(--green-900)' }}>
              <Icon name='TrendingUp' />
              +{tranding.all.last} during last 24 hours
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {tranding.all.total} requests during all the times <Icon name='TrendingUp' className='size-4' />
          </div>
          <div className='text-muted-foreground'>Total requests for the whole period</div>
        </CardFooter>
      </Card>
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Errors</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{tranding.errors.total}</CardTitle>
          <CardAction>
            <Badge style={{ background: 'var(--red-200)', color: 'var(--red-900)' }}>
              <Icon name='TrendingUp' />
              +{tranding.errors.last} during last 24 hours
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {tranding.errors.total} errors during all the times <Icon name='TrendingUp' className='size-4' />
          </div>
          <div className='text-muted-foreground'>Total errors for the whole period</div>
        </CardFooter>
      </Card>
    </div>
  );
}
