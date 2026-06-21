import type { RectificationStatus } from '@/types';
import { statusLabels, statusColors } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const statusIcons: Record<RectificationStatus, typeof Clock> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export default function StatusBadge({ status }: { status: RectificationStatus }) {
  const Icon = statusIcons[status];
  const isSpinning = status === 'processing';

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full', statusColors[status])}>
      <Icon className={cn('w-3.5 h-3.5', isSpinning && 'animate-spin')} />
      {statusLabels[status]}
    </span>
  );
}
