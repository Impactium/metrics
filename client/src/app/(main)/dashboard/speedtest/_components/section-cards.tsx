'server-only'
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@impactium/icons';
import { cookies } from 'next/headers';
import { Authorization, SERVER_SSR } from '../../../../../../constraints';
import { formatBytesToMbps, formatPrecision } from './utils';

export namespace SectionCards {
  export interface Trending {
    total: { sum: number; trending: number };
    download: { avg: number; last: number };
    upload: { avg: number; last: number };
    ping: { avg: number; last: number };
  }
}

export async function SectionCards() {
  const cookieStore = await cookies();
  const authorizationCookie = cookieStore.get(Authorization);
  if (!authorizationCookie) return null;

  const trending: SectionCards.Trending | null = await fetch(`http://${SERVER_SSR}/api/speedtest/tranding`, {
    credentials: 'include',
    headers: { Authorization: authorizationCookie.value },
    cache: 'no-store',
  }).then((response) => (response.ok ? response.json().then((payload) => payload.data) : null)).catch();

  if (!trending) return null;

  const calculatePercentChange = (currentValue: number, baselineValue: number) =>
    baselineValue === 0 ? (currentValue === 0 ? 0 : 100) : ((currentValue - baselineValue) / baselineValue) * 100;

  const formatSignedPercent = (percent: number) =>
    `${percent > 0 ? '+' : percent < 0 ? '-' : '+'}${Math.abs(formatPrecision(percent)).toFixed(1)}%`;

  const selectTrendIcon = (percent: number, higherIsBetter: boolean): Icon.Name => {
    const improved = higherIsBetter ? percent > 0 : percent < 0;
    return improved ? 'TrendingUp' : 'TrendingDown';
  };

  const getBadgeStyle = (improved: boolean) =>
    improved
      ? { background: 'var(--green-200)', color: 'var(--green-900)' }
      : { background: 'var(--red-200)', color: 'var(--red-900)' };

  const buildThroughputParams = (averageMbps: number, lastMbps: number) => {
    const percent = calculatePercentChange(lastMbps, averageMbps);
    const improved = percent > 0;
    return {
      titleValue: `${formatBytesToMbps(averageMbps)}Mbps`,
      signedPercent: formatSignedPercent(percent),
      percent,
      iconName: selectTrendIcon(percent, true),
      badgeStyle: getBadgeStyle(improved),
      footerText: `${formatSignedPercent(percent)} in the last 24 hours`,
    };
  };

  const buildLatencyParams = (averageMs: number, lastMs: number) => {
    const percent = calculatePercentChange(lastMs, averageMs);
    const improved = percent < 0;
    return {
      titleValue: `${formatPrecision(averageMs)}ms`,
      signedPercent: formatSignedPercent(percent),
      percent,
      iconName: selectTrendIcon(percent, false),
      badgeStyle: getBadgeStyle(improved),
      footerText: `${formatSignedPercent(percent)} in the last 24 hours`,
    };
  };

  const downloadParams = buildThroughputParams(trending.download.avg, trending.download.last);
  const uploadParams = buildThroughputParams(trending.upload.avg, trending.upload.last);
  const pingParams = buildLatencyParams(trending.ping.avg, trending.ping.last);

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Total tests</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{trending.total.sum}</CardTitle>
          <CardAction>
            <Badge style={getBadgeStyle(true)}>
              <Icon name='TrendingUp' />
              {trending.total.trending}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {trending.total.trending} tests during last 24 hours <Icon name='TrendingUp' className='size-4' />
          </div>
          <div className='text-muted-foreground'>Total tests for the whole period</div>
        </CardFooter>
      </Card>

      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Download speed</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{downloadParams.titleValue}</CardTitle>
          <CardAction>
            <Badge style={downloadParams.badgeStyle}>
              <Icon name={downloadParams.iconName} />
              {downloadParams.signedPercent}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {downloadParams.footerText} <Icon name={downloadParams.iconName} className='size-4' />
          </div>
          <div className='text-muted-foreground'>Average download speed over the last 7 days</div>
        </CardFooter>
      </Card>

      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Upload speed</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{uploadParams.titleValue}</CardTitle>
          <CardAction>
            <Badge style={uploadParams.badgeStyle}>
              <Icon name={uploadParams.iconName} />
              {uploadParams.signedPercent}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {uploadParams.footerText} <Icon name={uploadParams.iconName} className='size-4' />
          </div>
          <div className='text-muted-foreground'>Average upload speed over the last 7 days</div>
        </CardFooter>
      </Card>

      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Latency</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{pingParams.titleValue}</CardTitle>
          <CardAction>
            <Badge style={pingParams.badgeStyle}>
              <Icon name={pingParams.iconName} />
              {pingParams.signedPercent}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {pingParams.footerText} <Icon name={pingParams.iconName} className='size-4' />
          </div>
          <div className='text-muted-foreground'>Average latency over the last 7 days</div>
        </CardFooter>
      </Card>
    </div>
  );
}
