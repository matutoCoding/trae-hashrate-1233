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
  Filter,
  Bell,
  CheckSquare,
  Square,
  X,
  Megaphone,
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
  LineChart,
  Line,
} from 'recharts';
import { useReportStore } from '@/store/useReportStore';
import { useRectificationStore } from '@/store/useRectificationStore';
import type { DrillState, DepartmentStat, ProjectStat, FolderStat, Rectification, AuditReport, RectificationStatus, RiskType } from '@/types';
import { cn } from '@/lib/utils';
import { exportExcel, exportPDF } from '@/utils/export';
import { getScreenshot, clearAllData } from '@/utils/storage';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const periods = ['2025年6月', '2025年5月', '2025年4月', '2025年Q2', '2025年Q1'];

const riskTypeOptions: { value: string; label: string }[] = [
  { value: 'all', label: '全部风险类型' },
  { value: 'external_access', label: '外部可访问' },
  { value: 'resigned_access', label: '离职人员权限' },
  { value: 'too_many_editors', label: '可编辑人数过多' },
  { value: 'long_unaccessed', label: '长期未访问' },
];

const statusOptions: { value: RectificationStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
];

export default function AuditReportPage() {
  const navigate = useNavigate();
  const { period, setPeriod, drill, setDrill, resetDrill } = useReportStore();
  const {
    rectifications,
    computeFullDepartmentStats,
    computeFullProjectStats,
    computeFullFolderStats,
    getRectificationsForDrill,
    getOverviewStats,
    getFilteredByScope,
    initialize,
    updateRectificationStatus,
    computeTrendData,
    batchRemind,
    getLastReminderTime,
  } = useRectificationStore();

  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [previewScreenshot, setPreviewScreenshot] = useState<{ name: string; data: string } | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRect, setSelectedRect] = useState<string | null>(null);
  const [riskTypeFilter, setRiskTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<RectificationStatus | 'all'>('all');
  const [selectedRectIds, setSelectedRectIds] = useState<string[]>([]);
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [remindMessage, setRemindMessage] = useState('');
  const [remindSuccess, setRemindSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === '1') {
      clearAllData();
      window.location.href = window.location.pathname;
      return;
    }
    initialize();
  }, [initialize]);

  const scopeFilter = useMemo(() => {
    const filter: { period?: string; department?: string; project?: string; folderId?: string; riskType?: string; status?: RectificationStatus | 'all' } = { period };
    if (drill.department) filter.department = drill.department;
    if (drill.project) filter.project = drill.project;
    if (drill.folderId) filter.folderId = drill.folderId;
    if (riskTypeFilter !== 'all') filter.riskType = riskTypeFilter;
    if (statusFilter !== 'all') filter.status = statusFilter;
    return filter;
  }, [period, drill, riskTypeFilter, statusFilter]);

  const currentStats = useMemo(() => {
    return getOverviewStats(scopeFilter);
  }, [rectifications, period, drill, riskTypeFilter, statusFilter, getOverviewStats]);

  const drillContent = useMemo(() => {
    const filter = { period, riskType: riskTypeFilter !== 'all' ? riskTypeFilter : undefined, status: statusFilter !== 'all' ? statusFilter : undefined };

    if (drill.level === 'overview') {
      return computeFullDepartmentStats(filter);
    }
    if (drill.level === 'department' && drill.department) {
      return computeFullProjectStats({ ...filter, department: drill.department });
    }
    if (drill.level === 'project' && drill.department && drill.project) {
      return computeFullFolderStats({ ...filter, department: drill.department, project: drill.project });
    }
    if (drill.level === 'folder' && drill.folderId) {
      return computeFullFolderStats({ ...filter, folderId: drill.folderId });
    }
    return [];
  }, [drill, rectifications, period, riskTypeFilter, statusFilter, computeFullDepartmentStats, computeFullProjectStats, computeFullFolderStats]);

  const drillRectifications = useMemo(() => {
    if (drill.level === 'rectifications') {
      const rects = getRectificationsForDrill(
        'folder',
        drill.department,
        drill.project,
        drill.folderId,
        period,
        riskTypeFilter !== 'all' ? riskTypeFilter : undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      ).sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return 0;
      });
      return rects;
    }
    return [];
  }, [drill, rectifications, period, riskTypeFilter, statusFilter, getRectificationsForDrill]);

  const currentScopeRectifications = useMemo(() => {
    return getFilteredByScope(scopeFilter);
  }, [rectifications, scopeFilter, getFilteredByScope]);

  const trendData = useMemo(() => {
    return computeTrendData(6, scopeFilter);
  }, [rectifications, scopeFilter, computeTrendData]);

  const trendChartData = useMemo(() => {
    return trendData.map((item) => ({
      name: item.monthLabel,
      新增: item.newCount,
      完成: item.completedCount,
      遗留: item.pendingCount,
    }));
  }, [trendData]);

  const chartData = useMemo(() => {
    if (drill.level === 'rectifications') return [];
    const list = (drillContent as Array<{ name: string; totalIssues: number; resolved: number; pending: number; processing: number; overdue: number }>).slice(0, 10);

    return list.map((item) => ({
      name: item.name,
      已处理: item.resolved,
      处理中: item.processing,
      待处理: item.pending,
      逾期: item.overdue,
    }));
  }, [drill, drillContent]);

  const chartTitle = useMemo(() => {
    if (drill.level === 'overview') return '各部门风险分布';
    if (drill.level === 'department') return `${drill.department} 各项目风险分布`;
    if (drill.level === 'project') return `${drill.project} 各文件夹风险分布`;
    if (drill.level === 'folder') return `${drill.folderName} 风险分布`;
    return '风险分布';
  }, [drill]);

  const sectionTitle = useMemo(() => {
    if (drill.level === 'overview') return '部门统计';
    if (drill.level === 'department') return `${drill.department} - 项目统计`;
    if (drill.level === 'project') return `${drill.project} - 文件夹统计`;
    if (drill.level === 'folder') return `${drill.folderName} - 详情`;
    return '';
  }, [drill]);

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

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    resetDrill();
    setShowPeriodDropdown(false);
    setSelectedRectIds([]);
  };

  const handleToggleSelectAll = () => {
    if (selectedRectIds.length === drillRectifications.length) {
      setSelectedRectIds([]);
    } else {
      setSelectedRectIds(drillRectifications.map((r) => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedRectIds.includes(id)) {
      setSelectedRectIds(selectedRectIds.filter((i) => i !== id));
    } else {
      setSelectedRectIds([...selectedRectIds, id]);
    }
  };

  const handleBatchRemind = () => {
    if (selectedRectIds.length === 0) return;
    setShowRemindModal(true);
  };

  const handleConfirmRemind = async () => {
    if (selectedRectIds.length === 0) return;
    batchRemind(selectedRectIds, remindMessage.trim() || undefined);
    setRemindSuccess(true);
    setTimeout(() => {
      setShowRemindModal(false);
      setRemindSuccess(false);
      setRemindMessage('');
      setSelectedRectIds([]);
    }, 1500);
  };

  const handleDrillToDepartment = (stat: DepartmentStat) => {
    setDrill({ level: 'department', department: stat.name });
    setSelectedRectIds([]);
  };

  const handleDrillToProject = (stat: ProjectStat) => {
    setDrill({ level: 'project', department: stat.department, project: stat.name });
    setSelectedRectIds([]);
  };

  const handleDrillToFolder = (stat: FolderStat) => {
    setDrill({
      level: 'folder',
      department: stat.department,
      project: stat.project,
      folderId: stat.folderId,
      folderName: stat.name,
    });
    setSelectedRectIds([]);
  };

  const handleDrillToRectifications = (stat: FolderStat) => {
    setDrill({
      level: 'rectifications',
      department: stat.department,
      project: stat.project,
      folderId: stat.folderId,
      folderName: stat.name,
    });
    setSelectedRectIds([]);
  };

  const handleBreadcrumbClick = (drillState?: DrillState) => {
    if (drillState) {
      setDrill(drillState);
      setSelectedRectIds([]);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const filter = { 
        period,
        riskType: riskTypeFilter !== 'all' ? riskTypeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const deptStats = computeFullDepartmentStats(filter);
      const projStats = drill.department
        ? computeFullProjectStats({ ...filter, department: drill.department })
        : computeFullProjectStats(filter);
      const foldStats = drill.department && drill.project
        ? computeFullFolderStats({ ...filter, department: drill.department, project: drill.project })
        : drill.folderId
        ? computeFullFolderStats({ ...filter, folderId: drill.folderId })
        : computeFullFolderStats(filter);

      const report: AuditReport = {
        period,
        totalIssues: currentStats.total,
        resolved: currentStats.resolved,
        pending: currentStats.pending,
        processing: currentStats.processing,
        overdue: currentStats.overdue,
        completionRate: currentStats.rate,
        departmentStats: deptStats,
        projectStats: projStats,
        folderStats: foldStats,
      };
      await exportExcel(
        report,
        'department',
        drill,
        currentScopeRectifications
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
      const filter = { 
        period,
        riskType: riskTypeFilter !== 'all' ? riskTypeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const deptStats = computeFullDepartmentStats(filter);
      const projStats = drill.department
        ? computeFullProjectStats({ ...filter, department: drill.department })
        : computeFullProjectStats(filter);
      const foldStats = drill.department && drill.project
        ? computeFullFolderStats({ ...filter, department: drill.department, project: drill.project })
        : drill.folderId
        ? computeFullFolderStats({ ...filter, folderId: drill.folderId })
        : computeFullFolderStats(filter);

      const report: AuditReport = {
        period,
        totalIssues: currentStats.total,
        resolved: currentStats.resolved,
        pending: currentStats.pending,
        processing: currentStats.processing,
        overdue: currentStats.overdue,
        completionRate: currentStats.rate,
        departmentStats: deptStats,
        projectStats: projStats,
        folderStats: foldStats,
      };
      await exportPDF(
        report,
        'department',
        drill,
        currentScopeRectifications
      );
    } catch (err) {
      console.error(err);
      alert('生成PDF失败');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleOpenProcess = (id: string) => {
    setSelectedRect(id);
    setShowProcessModal(true);
  };

  const handleStartProcessing = (id: string) => {
    updateRectificationStatus(id, 'processing');
  };

  const scopeLabel = useMemo(() => {
    if (drill.level === 'overview') return '全公司';
    if (drill.level === 'department') return drill.department || '全公司';
    if (drill.level === 'project') return `${drill.department} / ${drill.project}`;
    if (drill.level === 'folder' || drill.level === 'rectifications') return `${drill.department} / ${drill.project} / ${drill.folderName}`;
    return '全公司';
  }, [drill]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审计报告</h1>
          <p className="mt-1 text-sm text-gray-500">
            统计范围：<span className="font-medium text-gray-700">{scopeLabel}</span>
            {' · '}
            周期：<span className="font-medium text-gray-700">{period}</span>
            {(riskTypeFilter !== 'all' || statusFilter !== 'all') && (
              <>
                {' · '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  已筛选
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((item, idx) => (
              <div key={idx} className="flex items-center">
                {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
                {item.drill ? (
                  <button
                    onClick={() => handleBreadcrumbClick(item.drill)}
                    className={cn(
                      'text-blue-600 hover:text-blue-700 hover:underline transition-colors',
                      idx === breadcrumbs.length - 1 && 'font-medium'
                    )}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-gray-600 font-medium">{item.label}</span>
                )}
              </div>
            ))}
          </nav>

          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{period}</span>
              <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', showPeriodDropdown && 'rotate-90')} />
            </button>
            {showPeriodDropdown && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors',
                      p === period ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors',
              showFilterPanel || riskTypeFilter !== 'all' || statusFilter !== 'all'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">筛选</span>
            {(riskTypeFilter !== 'all' || statusFilter !== 'all') && (
              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {(riskTypeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            生成PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            导出Excel
          </button>
        </div>
      </div>

      {showFilterPanel && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">筛选条件</h3>
            <button
              onClick={() => {
                setRiskTypeFilter('all');
                setStatusFilter('all');
                setShowFilterPanel(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              重置筛选
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">风险类型</label>
              <select
                value={riskTypeFilter}
                onChange={(e) => setRiskTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {riskTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">整改状态</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RectificationStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">问题总数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{currentStats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <FileBarChart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {currentStats.total > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              完成率 <span className="font-medium text-blue-600">{currentStats.rate}%</span>
            </p>
          )}
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
          {currentStats.total > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              占比 <span className="font-medium text-green-600">{Math.round((currentStats.resolved / currentStats.total) * 100)}%</span>
            </p>
          )}
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
          {currentStats.total > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              占比 <span className="font-medium text-blue-600">{Math.round((currentStats.processing / currentStats.total) * 100)}%</span>
            </p>
          )}
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
          <p className="mt-3 text-xs text-amber-600">需在本月底前完成</p>
        </div>
        <div className={cn(
          'rounded-xl border p-5',
          currentStats.overdue > 0 ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200' : 'bg-white border-gray-200'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">逾期未处理</p>
              <p className={cn('mt-2 text-3xl font-bold', currentStats.overdue > 0 ? 'text-red-600' : 'text-gray-400')}>
                {currentStats.overdue}
              </p>
            </div>
            <div className={cn('p-3 rounded-xl', currentStats.overdue > 0 ? 'bg-red-100' : 'bg-gray-50')}>
              <AlertTriangle className={cn('w-6 h-6', currentStats.overdue > 0 ? 'text-red-600' : 'text-gray-400')} />
            </div>
          </div>
          <p className={cn(
            'mt-3 text-xs',
            currentStats.overdue > 0 ? 'text-red-600 font-medium' : 'text-gray-400'
          )}>
            {currentStats.overdue > 0 ? '请重点跟进催办' : '暂无逾期任务'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">整改趋势分析</h2>
          <span className="text-xs text-gray-500">最近 6 个月</span>
        </div>
        {trendChartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="新增" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="完成" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="遗留" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>暂无趋势数据</p>
          </div>
        )}
      </div>

      {drill.level !== 'rectifications' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{chartTitle}</h2>
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
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
            <div className="h-72 flex items-center justify-center">
              <p className="text-gray-400">当前周期和范围内暂无数据</p>
            </div>
          )}
        </div>
      )}

      {drill.level !== 'rectifications' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{sectionTitle}</h2>
          </div>
          {drillContent.length === 0 ? (
            <div className="py-16 text-center">
              <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">当前周期和范围内暂无数据</p>
            </div>
          ) : (
            <div className="p-5">
              {drill.level === 'folder' ? (
                <FolderDetailCard
                  stat={drillContent[0] as FolderStat}
                  onViewRectifications={() => handleDrillToRectifications(drillContent[0] as FolderStat)}
                />
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(drillContent as Array<DepartmentStat | ProjectStat | FolderStat>).map((stat, idx) => (
                    <StatCard
                      key={stat.name}
                      stat={stat}
                      color={COLORS[idx % COLORS.length]}
                      onClick={() => {
                        if (drill.level === 'overview') {
                          handleDrillToDepartment(stat as DepartmentStat);
                        } else if (drill.level === 'department') {
                          handleDrillToProject(stat as ProjectStat);
                        } else if (drill.level === 'project') {
                          handleDrillToFolder(stat as FolderStat);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" />
              {drill.level === 'folder'
                ? '点击上方按钮查看该文件夹的整改单明细'
                : drill.level === 'project'
                ? '点击卡片可下钻查看该文件夹详情'
                : drill.level === 'department'
                ? '点击卡片可下钻查看该项目下的文件夹'
                : '点击卡片可下钻查看该部门下的项目'}
            </p>
          </div>
        </div>
      )}

      {drill.level === 'rectifications' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedRectIds.length === drillRectifications.length && drillRectifications.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">
                  {selectedRectIds.length > 0 ? `已选 ${selectedRectIds.length} 项` : '全选'}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {selectedRectIds.length > 0 && (
                <button
                  onClick={handleBatchRemind}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  <Megaphone className="w-4 h-4" />
                  批量催办
                </button>
              )}
              <span className="text-sm text-gray-500">
                共 <span className="font-medium text-gray-900">{drillRectifications.length}</span> 条记录
              </span>
            </div>
          </div>
          {drillRectifications.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">该文件夹暂无整改记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {drillRectifications.map((todo) => {
                const isSelected = selectedRectIds.includes(todo.id);
                const lastRemind = getLastReminderTime(todo.id);
                return (
                <div
                  key={todo.id}
                  className={cn(
                    'p-5 hover:bg-gray-50 transition-colors',
                    todo.isOverdue && 'bg-red-50/30',
                    isSelected && 'bg-blue-50/50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleSelect(todo.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-medium text-gray-900">{todo.folderName}</h3>
                        <StatusBadge status={todo.status} />
                        {todo.isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                            <AlertCircle className="w-3 h-3" />
                            已逾期
                          </span>
                        )}
                        {todo.screenshot && todo.status === 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const data = getScreenshot(todo.screenshot!);
                              if (data) setPreviewScreenshot({ name: todo.screenshot!, data });
                              else alert('截图文件暂不可用');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                          >
                            <FileImage className="w-3 h-3" />
                            查看凭证
                          </button>
                        )}
                        {todo.reminderCount && todo.reminderCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-medium rounded">
                            <Bell className="w-3 h-3" />
                            已催办 {todo.reminderCount} 次
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{todo.opinion}</p>
                      {todo.result && (
                        <p className="mt-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                          <span className="font-medium">处理结果：</span>{todo.result}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap mt-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          审计员：{todo.auditorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          负责人：{todo.ownerName}
                        </span>
                        <span>涉及 {todo.memberIds.length} 名成员：{todo.memberNames.join('、')}</span>
                        <span>发起：{todo.createdAt}</span>
                        {todo.completedAt && <span>完成：{todo.completedAt}</span>}
                        {lastRemind && (
                          <span className="text-orange-500">最近催办：{lastRemind}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {todo.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStartProcessing(todo.id)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            开始处理
                          </button>
                          <button
                            onClick={() => navigate('/todos')}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            前往处理
                          </button>
                        </>
                      )}
                      {todo.status === 'processing' && (
                        <button
                          onClick={() => handleOpenProcess(todo.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          提交结果
                        </button>
                      )}
                      {todo.status === 'completed' && (
                        <button
                          onClick={() => navigate(`/folder/${todo.folderId}`)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          查看详情
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="整改处理"
        size="lg"
      >
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">请前往待办中心处理该整改任务</p>
          <button
            onClick={() => {
              setShowProcessModal(false);
              navigate('/todos');
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            前往待办中心
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!previewScreenshot}
        onClose={() => setPreviewScreenshot(null)}
        title="凭证截图预览"
        size="lg"
      >
        {previewScreenshot && (
          <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
            <img src={previewScreenshot.data} alt={previewScreenshot.name} className="max-h-[60vh] max-w-full rounded-md shadow-md" />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showRemindModal}
        onClose={() => !remindSuccess && setShowRemindModal(false)}
        title="批量催办"
        size="md"
      >
        {remindSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">催办成功</h3>
            <p className="text-sm text-gray-500">已向 {selectedRectIds.length} 项任务发送催办通知</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              您已选择 <span className="font-semibold text-blue-600">{selectedRectIds.length}</span> 项整改任务，
              确认要批量催办吗？
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">催办留言（可选）</label>
              <textarea
                value={remindMessage}
                onChange={(e) => setRemindMessage(e.target.value)}
                placeholder="请输入催办留言..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRemindModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRemind}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Megaphone className="w-4 h-4" />
                确认催办
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  stat,
  color,
  onClick,
}: {
  stat: DepartmentStat | ProjectStat | FolderStat;
  color: string;
  onClick: () => void;
}) {
  const completionRate = stat.totalIssues > 0 ? Math.round((stat.resolved / stat.totalIssues) * 100) : 0;
  const isOverdue = stat.overdue > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group',
        isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Building2 className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {stat.name}
            </h3>
            <p className="text-xs text-gray-400">共 {stat.totalIssues} 项</p>
          </div>
        </div>
        {isOverdue && (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
            逾期
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${completionRate}%`,
              backgroundColor: completionRate >= 80 ? '#10B981' : completionRate >= 50 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-green-600">{stat.resolved}</p>
            <p className="text-xs text-gray-400">已处理</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">{stat.processing}</p>
            <p className="text-xs text-gray-400">处理中</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-600">{stat.pending}</p>
            <p className="text-xs text-gray-400">待处理</p>
          </div>
          <div>
            <p className={cn('text-lg font-bold', stat.overdue > 0 ? 'text-red-600' : 'text-gray-400')}>
              {stat.overdue}
            </p>
            <p className="text-xs text-gray-400">逾期</p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          完成率 <span className="font-medium text-gray-700">{completionRate}%</span>
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </div>
  );
}

function FolderDetailCard({
  stat,
  onViewRectifications,
}: {
  stat: FolderStat;
  onViewRectifications: () => void;
}) {
  const completionRate = stat.totalIssues > 0 ? Math.round((stat.resolved / stat.totalIssues) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <FolderOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{stat.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {stat.department} · {stat.project}
            </p>
          </div>
        </div>
        <button
          onClick={onViewRectifications}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ListChecks className="w-4 h-4" />
          查看整改单列表 ({stat.totalIssues})
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 text-center border border-blue-100">
          <p className="text-3xl font-bold text-blue-600">{stat.totalIssues}</p>
          <p className="text-sm text-gray-500 mt-1">问题总数</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-green-100">
          <p className="text-3xl font-bold text-green-600">{stat.resolved}</p>
          <p className="text-sm text-gray-500 mt-1">已处理</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-amber-100">
          <p className="text-3xl font-bold text-amber-600">{stat.pending + stat.processing}</p>
          <p className="text-sm text-gray-500 mt-1">进行中</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
          <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
          <p className="text-sm text-gray-500 mt-1">完成率</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">整改进度</span>
          <span className="font-medium text-gray-900">{completionRate}%</span>
        </div>
        <div className="h-3 bg-white rounded-full overflow-hidden border border-blue-100">
          <div
            className="h-full rounded-full transition-all bg-gradient-to-r from-blue-500 to-indigo-600"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
