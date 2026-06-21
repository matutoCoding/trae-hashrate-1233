import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileBarChart,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  Home,
  Building2,
  FileText,
  FolderOpen,
  User,
  ArrowLeft,
  AlertCircle,
  FileImage,
  ListChecks,
  XCircle,
  PlayCircle,
  ClipboardList,
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
} from 'recharts';
import { useReportStore } from '@/store/useReportStore';
import { useRectificationStore } from '@/store/useRectificationStore';
import type { DrillState, DepartmentStat, ProjectStat, FolderStat, Rectification, AuditReport } from '@/types';
import { cn } from '@/lib/utils';
import { exportExcel, exportPDF } from '@/utils/export';
import { getScreenshot } from '@/utils/storage';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const periods = ['2025年6月', '2025年5月', '2025年4月', '2025年Q2', '2025年Q1'];

export default function AuditReportPage() {
  const navigate = useNavigate();
  const { period, setPeriod, drill, setDrill, resetDrill } = useReportStore();
  const {
    rectifications,
    computeFullDepartmentStats,
    computeFullProjectStats,
    computeFullFolderStats,
    getRectificationsForDrill,
    initialize,
    updateRectificationStatus,
  } = useRectificationStore();

  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [previewScreenshot, setPreviewScreenshot] = useState<{ name: string; data: string } | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRect, setSelectedRect] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const overviewStats = useMemo(() => {
    const deptStats = computeFullDepartmentStats();
    const total = deptStats.reduce((s, d) => s + d.totalIssues, 0);
    const resolved = deptStats.reduce((s, d) => s + d.resolved, 0);
    const pending = deptStats.reduce((s, d) => s + d.pending, 0);
    const processing = deptStats.reduce((s, d) => s + d.processing, 0);
    const overdue = deptStats.reduce((s, d) => s + d.overdue, 0);
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, pending, processing, overdue, rate };
  }, [rectifications, computeFullDepartmentStats]);

  const drillContent = useMemo(() => {
    if (drill.level === 'overview' || drill.level === 'department') {
      return computeFullDepartmentStats();
    }
    if (drill.level === 'project') {
      return computeFullProjectStats(drill.department);
    }
    if (drill.level === 'folder') {
      return computeFullFolderStats(drill.department, drill.project);
    }
    return [];
  }, [drill, rectifications, computeFullDepartmentStats, computeFullProjectStats, computeFullFolderStats]);

  const drillRectifications = useMemo(() => {
    if (drill.level === 'rectifications' && drill.department) {
      return getRectificationsForDrill(
        'folder',
        drill.department,
        drill.project,
        drill.folderId
      ).sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return 0;
      });
    }
    return [];
  }, [drill, rectifications, getRectificationsForDrill]);

  const chartData = useMemo(() => {
    const list = drill.level === 'rectifications'
      ? []
      : (drillContent as Array<{ name: string; totalIssues: number; resolved: number; pending: number; processing: number; overdue: number }>).slice(0, 10);

    return list.map((item) => ({
      name: item.name,
      已处理: item.resolved,
      处理中: item.processing,
      待处理: item.pending,
      逾期: item.overdue,
    }));
  }, [drill, drillContent]);

  const currentStats = useMemo(() => {
    if (drill.level === 'overview') {
      return overviewStats;
    }
    const list = drillContent as Array<{ totalIssues: number; resolved: number; pending: number; processing: number; overdue: number }>;
    const total = list.reduce((s, d) => s + d.totalIssues, 0);
    const resolved = list.reduce((s, d) => s + d.resolved, 0);
    const pending = list.reduce((s, d) => s + d.pending, 0);
    const processing = list.reduce((s, d) => s + d.processing, 0);
    const overdue = list.reduce((s, d) => s + d.overdue, 0);
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, pending, processing, overdue, rate };
  }, [drill, drillContent, overviewStats]);

  const breadcrumbs = useMemo(() => {
    const items: { label: string; drill?: DrillState }[] = [{ label: '概览', drill: { level: 'overview' } }];
    if (drill.level !== 'overview' && drill.department) {
      items.push({ label: drill.department, drill: { level: 'department', department: drill.department } });
    }
    if ((drill.level === 'project' || drill.level === 'folder' || drill.level === 'rectifications') && drill.project) {
      items.push({ label: drill.project, drill: { level: 'project', department: drill.department, project: drill.project } });
    }
    if ((drill.level === 'folder' || drill.level === 'rectifications') && drill.folderName) {
      items.push({ label: drill.folderName, drill: { level: 'folder', department: drill.department, project: drill.project, folderId: drill.folderId, folderName: drill.folderName } });
    }
    if (drill.level === 'rectifications') {
      items.push({ label: '整改单明细' });
    }
    return items;
  }, [drill]);

  const handleDrillToDepartment = (stat: DepartmentStat) => {
    setDrill({ level: 'department', department: stat.name });
  };

  const handleDrillToProject = (stat: ProjectStat) => {
    setDrill({ level: 'project', department: stat.department, project: stat.name });
  };

  const handleDrillToFolder = (stat: FolderStat) => {
    setDrill({
      level: 'folder',
      department: stat.department,
      project: stat.project,
      folderId: stat.folderId,
      folderName: stat.name,
    });
  };

  const handleDrillToRectifications = () => {
    setDrill({
      level: 'rectifications',
      department: drill.department,
      project: drill.project,
      folderId: drill.folderId,
      folderName: drill.folderName,
    });
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const deptStats = computeFullDepartmentStats();
      const report: AuditReport = {
        period,
        totalIssues: overviewStats.total,
        resolved: overviewStats.resolved,
        pending: overviewStats.pending,
        processing: overviewStats.processing,
        overdue: overviewStats.overdue,
        completionRate: overviewStats.rate,
        departmentStats: deptStats,
        projectStats: computeFullProjectStats(),
        folderStats: computeFullFolderStats(),
      };
      await exportExcel(
        report,
        'department',
        drill,
        drillRectifications
      );
    } catch (err) {
      console.error(err);
      alert('导出Excel失败');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const deptStats = computeFullDepartmentStats();
      const report: AuditReport = {
        period,
        totalIssues: overviewStats.total,
        resolved: overviewStats.resolved,
        pending: overviewStats.pending,
        processing: overviewStats.processing,
        overdue: overviewStats.overdue,
        completionRate: overviewStats.rate,
        departmentStats: deptStats,
        projectStats: computeFullProjectStats(),
        folderStats: computeFullFolderStats(),
      };
      await exportPDF(
        report,
        'department',
        drill,
        drillRectifications
      );
    } catch (err) {
      console.error(err);
      alert('生成PDF失败');
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePreviewScreenshot = (fileName: string) => {
    const data = getScreenshot(fileName);
    if (data) {
      setPreviewScreenshot({ name: fileName, data });
    } else {
      alert('截图凭证暂不可用');
    }
  };

  const handleQuickProcess = (id: string) => {
    setSelectedRect(id);
    setShowProcessModal(true);
  };

  const handleStartProcessing = (id: string) => {
    updateRectificationStatus(id, 'processing');
  };

  const currentRect = selectedRect ? rectifications.find((r) => r.id === selectedRect) : null;

  const getScopeLabel = () => {
    if (drill.level === 'overview') return '全公司';
    if (drill.level === 'department') return `部门：${drill.department}`;
    if (drill.level === 'project') return `项目：${drill.project}`;
    if (drill.level === 'folder') return `文件夹：${drill.folderName}`;
    if (drill.level === 'rectifications') return `整改单列表：${drill.folderName}`;
    return '';
  };

  const StatCard = ({ stat, onClick, icon: Icon, delayDrill }: {
    stat: DepartmentStat | ProjectStat | FolderStat;
    onClick?: () => void;
    icon?: typeof Building2;
    delayDrill?: () => void;
  }) => {
    const rate = stat.totalIssues > 0 ? Math.round((stat.resolved / stat.totalIssues) * 100) : 0;
    const isDepartment = 'department' in stat === false || drill.level === 'department';
    const isProject = 'department' in stat && 'project' in stat === false;
    const isFolder = 'department' in stat && 'project' in stat;

    return (
      <div
        onClick={onClick}
        className={cn(
          'bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer',
          stat.overdue > 0 ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-blue-200'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className={cn('w-4 h-4', isDepartment ? 'text-blue-600' : isProject ? 'text-purple-600' : 'text-emerald-600')} />}
              <h3 className="font-semibold text-gray-900 truncate max-w-[200px]">{stat.name}</h3>
              {stat.overdue > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {stat.overdue} 逾期
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{stat.totalIssues}</span>
              <span className="text-xs text-gray-500">条任务</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn(
              'text-lg font-bold',
              rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'
            )}>
              {rate}%
            </span>
            {onClick && (
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {stat.resolved}
            </span>
            <span className="text-blue-600 flex items-center gap-1">
              <PlayCircle className="w-3 h-3" />
              {stat.processing}
            </span>
            <span className="text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stat.pending}
            </span>
            {stat.overdue > 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {stat.overdue}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              rate >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
              rate >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
              'bg-gradient-to-r from-red-400 to-rose-500'
            )}
            style={{ width: `${rate}%` }}
          />
        </div>
        {delayDrill && (
          <button
            onClick={(e) => { e.stopPropagation(); delayDrill(); }}
            className="mt-3 w-full py-1.5 text-xs text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            查看整改单列表 →
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">审计报告</h1>
            <span className="text-sm text-gray-400">· {getScopeLabel()}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {breadcrumbs.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.drill ? (
                  <button
                    onClick={() => setDrill(item.drill!)}
                    className={cn(
                      'text-sm hover:underline',
                      idx === breadcrumbs.length - 1 ? 'text-blue-600 font-medium' : 'text-gray-500'
                    )}
                  >
                    {idx === 0 && <Home className="w-3.5 h-3.5 inline mr-1" />}
                    {item.label}
                  </button>
                ) : (
                  <span className="text-sm text-blue-600 font-medium">{item.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {drill.level !== 'overview' && (
            <button
              onClick={resetDrill}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回概览
            </button>
          )}
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
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className={cn(
              'px-4 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center gap-2 shadow-sm',
              exportingPDF
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            )}
          >
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
            {exportingPDF ? '生成中...' : '生成PDF'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm',
              exportingExcel
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportingExcel ? '导出中...' : '导出Excel'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">问题总数</p>
              <p className="mt-2 text-3xl font-bold">{currentStats.total}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-blue-200">
            <TrendingUp className="w-4 h-4" />
            {getScopeLabel()}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已处理</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{currentStats.resolved}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${currentStats.rate}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">处理中</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{currentStats.processing}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            占比 {currentStats.total > 0 ? Math.round((currentStats.processing / currentStats.total) * 100) : 0}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{currentStats.pending}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            需在本月底前完成
          </p>
        </div>

        <div className={cn(
          'rounded-xl border p-5',
          currentStats.overdue > 0
            ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
            : 'bg-white border-gray-200'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">逾期未处理</p>
              <p className={cn(
                'mt-2 text-3xl font-bold',
                currentStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'
              )}>
                {currentStats.overdue}
              </p>
            </div>
            <div className={cn(
              'p-3 rounded-xl',
              currentStats.overdue > 0 ? 'bg-red-100' : 'bg-gray-50'
            )}>
              <AlertCircle className={cn('w-6 h-6', currentStats.overdue > 0 ? 'text-red-600' : 'text-gray-400')} />
            </div>
          </div>
          <p className={cn(
            'mt-3 text-xs',
            currentStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'
          )}>
            {currentStats.overdue > 0 ? '请重点跟进催办' : '暂无逾期任务'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">风险分布</h2>
        {chartData.length > 0 ? (
          <div className="h-80">
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
                <Bar dataKey="处理中" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="待处理" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="逾期" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-400">当前层级为整改单明细，无柱状图数据</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListChecks className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">
              {drill.level === 'overview' && '部门统计'}
              {drill.level === 'department' && `「${drill.department}」下属项目`}
              {drill.level === 'project' && `「${drill.project}」下属文件夹`}
              {drill.level === 'folder' && `「${drill.folderName}」文件夹信息`}
              {drill.level === 'rectifications' && `整改单列表（${drillRectifications.length} 条）`}
            </h2>
          </div>
        </div>

        {drill.level !== 'rectifications' && drillContent.length > 0 && (
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              {drill.level === 'overview' &&
                (drillContent as DepartmentStat[]).map((stat) => (
                  <StatCard
                    key={stat.name}
                    stat={stat}
                    icon={Building2}
                    onClick={() => handleDrillToDepartment(stat)}
                  />
                ))}
              {drill.level === 'department' &&
                (drillContent as ProjectStat[]).map((stat) => (
                  <StatCard
                    key={stat.name}
                    stat={stat}
                    icon={FileText}
                    onClick={() => handleDrillToProject(stat)}
                  />
                ))}
              {drill.level === 'project' &&
                (drillContent as FolderStat[]).map((stat) => (
                  <StatCard
                    key={stat.folderId || stat.name}
                    stat={stat}
                    icon={FolderOpen}
                    onClick={() => handleDrillToFolder(stat)}
                  />
                ))}
              {drill.level === 'folder' &&
                (drillContent as FolderStat[]).map((stat) => (
                  <StatCard
                    key={stat.folderId || stat.name}
                    stat={stat}
                    icon={FolderOpen}
                    delayDrill={handleDrillToRectifications}
                  />
                ))}
            </div>
            {drill.level !== 'folder' && drillContent.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-blue-700">
                  💡 点击卡片可下钻查看下一级明细
                </p>
              </div>
            )}
          </div>
        )}

        {drill.level !== 'rectifications' && drillContent.length === 0 && (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">当前层级暂无数据</p>
          </div>
        )}

        {drill.level === 'rectifications' && (
          <div className="divide-y divide-gray-100">
            {drillRectifications.length === 0 ? (
              <div className="p-16 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无整改单数据</p>
              </div>
            ) : (
              drillRectifications.map((rect) => (
                <RectRow
                  key={rect.id}
                  rect={rect}
                  onPreviewScreenshot={handlePreviewScreenshot}
                  onProcess={handleQuickProcess}
                  onStartProcessing={handleStartProcessing}
                  onNavigateToFolder={() => navigate(`/folder/${rect.folderId}`)}
                />
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="处理整改"
        size="lg"
      >
        {currentRect && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-sm font-medium text-blue-900 mb-1">
                {currentRect.folderName} · 涉及 {currentRect.memberIds.length} 人
              </p>
              <p className="text-sm text-blue-700">
                <span className="font-medium">整改要求：</span>{currentRect.opinion}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                到期日期：{currentRect.dueDate} {currentRect.isOverdue && <span className="text-red-600 font-medium ml-1">（已逾期）</span>}
              </p>
            </div>
            <p className="text-sm text-gray-500">
              请在「待办中心」完成处理，点击下方按钮跳转：
            </p>
            <button
              onClick={() => {
                setShowProcessModal(false);
                navigate('/todos');
              }}
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              前往待办中心处理
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!previewScreenshot}
        onClose={() => setPreviewScreenshot(null)}
        title="凭证截图预览"
        size="lg"
      >
        {previewScreenshot && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 break-all">文件名：{previewScreenshot.name}</p>
            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 border border-gray-100">
              <img
                src={previewScreenshot.data}
                alt="凭证"
                className="max-h-[60vh] max-w-full rounded-md shadow-md"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RectRow({
  rect,
  onPreviewScreenshot,
  onProcess,
  onStartProcessing,
  onNavigateToFolder,
}: {
  rect: Rectification;
  onPreviewScreenshot: (fileName: string) => void;
  onProcess: (id: string) => void;
  onStartProcessing: (id: string) => void;
  onNavigateToFolder: () => void;
}) {
  return (
    <div
      className={cn(
        'p-5 hover:bg-gray-50 transition-colors group cursor-pointer',
        rect.isOverdue && 'bg-red-50/50'
      )}
      onClick={onNavigateToFolder}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {rect.folderName}
            </h3>
            <StatusBadge status={rect.status} />
            {rect.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                <AlertCircle className="w-3 h-3" />
                已逾期
              </span>
            )}
            {rect.screenshot && rect.status === 'completed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewScreenshot(rect.screenshot!);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors border border-green-100"
              >
                <FileImage className="w-3 h-3" />
                查看凭证
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{rect.opinion}</p>
          {rect.result && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-100">
              <span className="font-medium">处理结果：</span>{rect.result}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              审计员：{rect.auditorName}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              负责人：{rect.ownerName}
            </span>
            <span>成员：{rect.memberNames.join('、')}</span>
            <span>发起：{rect.createdAt}</span>
            <span className={rect.isOverdue ? 'text-red-500' : ''}>
              到期：{rect.dueDate}
            </span>
            {rect.completedAt && <span className="text-green-600">完成：{rect.completedAt}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {rect.status === 'pending' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onStartProcessing(rect.id); }}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                开始处理
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onProcess(rect.id); }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                处理
              </button>
            </>
          )}
          {rect.status === 'processing' && (
            <button
              onClick={(e) => { e.stopPropagation(); onProcess(rect.id); }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              提交结果
            </button>
          )}
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </div>
    </div>
  );
}
