import type { RiskType, RiskLevel } from '@/types';
import { riskTypeLabels, riskLevelLabels, riskLevelColors } from '@/utils/format';
import { cn } from '@/lib/utils';
import { AlertTriangle, UserX, Users, Clock } from 'lucide-react';

const riskIcons: Record<RiskType, typeof AlertTriangle> = {
  external_access: AlertTriangle,
  resigned_access: UserX,
  too_many_editors: Users,
  long_unaccessed: Clock,
};

const riskTagColors: Record<RiskType, string> = {
  external_access: 'bg-red-50 text-red-600 border-red-200',
  resigned_access: 'bg-orange-50 text-orange-600 border-orange-200',
  too_many_editors: 'bg-amber-50 text-amber-600 border-amber-200',
  long_unaccessed: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function RiskTypeTag({ type }: { type: RiskType }) {
  const Icon = riskIcons[type];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md', riskTagColors[type])}>
      <Icon className="w-3 h-3" />
      {riskTypeLabels[type]}
    </span>
  );
}

export function RiskLevelTag({ level }: { level: RiskLevel }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 text-xs font-medium border rounded-full', riskLevelColors[level])}>
      {riskLevelLabels[level]}
    </span>
  );
}

export default RiskTypeTag;
