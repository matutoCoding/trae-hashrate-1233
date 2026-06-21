export function formatFileSize(sizeMB: number): string {
  if (sizeMB < 1024) {
    return `${sizeMB} MB`;
  }
  const sizeGB = sizeMB / 1024;
  if (sizeGB < 1024) {
    return `${sizeGB.toFixed(1)} GB`;
  }
  const sizeTB = sizeGB / 1024;
  return `${sizeTB.toFixed(2)} TB`;
}

export const riskTypeLabels: Record<string, string> = {
  external_access: '外部可访问',
  resigned_access: '离职人员有权限',
  too_many_editors: '可编辑人数过多',
  long_unaccessed: '长期未访问',
};

export const riskLevelLabels: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export const riskLevelColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

export const roleLabels: Record<string, string> = {
  owner: '所有者',
  editor: '可编辑',
  viewer: '仅查看',
  commenter: '可评论',
};

export const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
  all: '全部',
};

export const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
  all: 'bg-gray-100 text-gray-700 border-gray-200',
};
