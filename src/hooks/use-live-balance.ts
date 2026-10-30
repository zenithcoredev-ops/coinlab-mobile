import { useMining } from '@/context/mining';
import { useNow } from '@/hooks/use-now';
import { liveBalanceAt } from '@/lib/mining-math';

/** The balance the Mine screen shows (settled + what the running session has accrued), ticking every second; null before the first status. */
export function useLiveBalance(): number | null {
  const { status, fetchedAt } = useMining();
  const now = useNow(1000);
  if (!status) return null;
  return liveBalanceAt(status, fetchedAt ? now - fetchedAt : 0);
}
