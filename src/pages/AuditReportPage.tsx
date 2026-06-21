import { useState, useMemo } from 'react';
import {
  FileBarChart,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  PieChart,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { useReportStore } from '@/store/useReportStore';
import type { ReportDimension } from '@/types';
import { cn } from '@/lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const periods = ['2025年6月', '2025年5月', '2025年4月', '2025年Q2', '2025年Q1'];

const dimensions: { value: ReportDimension; label: string }[] = [
  { value: 'department', label: '按部门' },
  { value: 'project', label: '按项目' },
  { value: 'folder', label: '按文件夹' },
];

export default function AuditReportPage() {
  const { period, dimension, setPeriod, setDimension, getReport } = useReportStore();
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const reportData = useMemo(() => getReport(), [getReport, period, dimension]);

  const chartData = useMemo(() => {
    if (dimension === 'department') {
      return reportData.departmentStats.map((item) => ({
        name: item.name,
        已处理: item.resolved,
        待处理: item.pending,
        总计: item.totalIssues,
      }));
    }
    if (dimension === 'project') {
      return reportData.projectStats.map((item) => ({
        name: item.name,
        已处理: item.resolved,
        待处理: item.pending,
        总计: item.totalIssues,
      }));
    }
    return reportData.folderStats.slice(0, 8).map((item) => ({
      name: item.name,
      已处理: item.resolved,
      待处理: item.pending,
      总计: item.totalIssues,
    }));
  }, [reportData, dimension]);

  const pieData = useMemo(() => {
    if (dimension === 'department') {
      return reportData.departmentStats.map((item, index) => ({
        name: item.name,
        value: item.totalIssues,
        color: COLORS[index % COLORS.length],
      }));
    }
    if (dimension === 'project') {
      return reportData.projectStats.map((item, index) => ({
        name: item.name,
        value: item.totalIssues,
        color: COLORS[index % COLORS.length],
      }));
    }
    return reportData.folderStats.slice(0, 8).map((item, index) => ({
      name: item.name,
      value: item.totalIssues,
      color: COLORS[index % COLORS.length],
    }));
  }, [reportData, dimension]);

  const detailData = useMemo(() => {
    if (dimension === 'department') {
      return reportData.departmentStats;
    }
    if (dimension === 'project') {
      return reportData.projectStats;
    }
    return reportData.folderStats;
  }, [reportData, dimension]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审计报告</h1>
          <p className="mt-1 text-sm text-gray-500">多维度权限风险分析，支持季度内控检查</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <FileBarChart className="w-4 h-4" />
            生成PDF
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">本月问题总数</p>
              <p className="mt-2 text-3xl font-bold">{reportData.totalIssues}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-blue-200">
            <TrendingUp className="w-4 h-4" />
            较上月增长 12%
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已处理</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{reportData.resolved}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${reportData.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{reportData.pending}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            需在本月底前完成整改
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">整改完成率</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{reportData.completionRate}%</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
            <TrendingUp className="w-3.5 h-3.5" />
            较上月提升 8 个百分点
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-900">风险分布分析</h2>

            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {dimensions.map((dim) => (
                <button
                  key={dim.value}
                  onClick={() => setDimension(dim.value)}
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                    dimension === dim.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {dim.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                {period}
              </button>
              {showPeriodDropdown && (
                <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {periods.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPeriod(p);
                        setShowPeriodDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors',
                        period === p && 'text-blue-600 bg-blue-50'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartType('bar')}
                className={cn(
                  'p-2 rounded-md transition-all',
                  chartType === 'bar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={cn(
                  'p-2 rounded-md transition-all',
                  chartType === 'pie' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <PieChart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 h-80">
          {chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="已处理" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="待处理" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">明细数据</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {dimension === 'department' ? '部门名称' : dimension === 'project' ? '项目名称' : '文件夹名称'}
                </th>
                {dimension !== 'department' && (
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    所属部门
                  </th>
                )}
                {dimension === 'folder' && (
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    所属项目
                  </th>
                )}
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  问题总数
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  已处理
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  待处理
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  完成率
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detailData.map((item, index) => {
                const rate = item.totalIssues > 0 ? Math.round((item.resolved / item.totalIssues) * 100) : 0;
                return (
                  <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-medium text-gray-900">
                        {dimension === 'department'
                          ? item.name
                          : dimension === 'project'
                          ? item.name
                          : item.name}
                      </span>
                    </td>
                    {dimension !== 'department' && (
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">
                          {'department' in item ? (item as { department: string }).department : '-'}
                        </span>
                      </td>
                    )}
                    {dimension === 'folder' && (
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">
                          {'project' in item ? (item as { project: string }).project : '-'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{item.totalIssues}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-medium text-green-600">{item.resolved}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-medium text-amber-600">{item.pending}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-12 text-right">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
