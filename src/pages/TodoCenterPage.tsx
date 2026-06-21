import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  FolderOpen,
  User,
  ChevronRight,
  Search,
  Upload,
  X,
  FileImage,
  AlertCircle,
  LayoutDashboard,
  List,
  Building2,
  CalendarClock,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';
import { useRectificationStore } from '@/store/useRectificationStore';
import type { RectificationStatus, Rectification } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import { fileToBase64, generateFileName, getScreenshot } from '@/utils/storage';

const statusTabs: { value: RectificationStatus | 'all'; label: string; icon: typeof Clock }[] = [
  { value: 'all', label: '全部', icon: ClipboardList },
  { value: 'pending', label: '待处理', icon: Clock },
  { value: 'processing', label: '处理中', icon: Loader2 },
  { value: 'completed', label: '已完成', icon: CheckCircle2 },
  { value: 'cancelled', label: '已取消', icon: XCircle },
];

type ViewMode = 'list' | 'workbench';

export default function TodoCenterPage() {
  const navigate = useNavigate();
  const {
    rectifications,
    statusFilter,
    setStatusFilter,
    getFilteredRectifications,
    getOwnerList,
    getDepartmentList,
    ownerFilter,
    departmentFilter,
    overdueFilter,
    setOwnerFilter,
    setDepartmentFilter,
    setOverdueFilter,
    updateRectificationStatus,
    initialize,
    refreshOverdue,
  } = useRectificationStore();

  useEffect(() => {
    initialize();
    refreshOverdue();
  }, [initialize, refreshOverdue]);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; base64: string } | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ownerList = useMemo(() => getOwnerList(), [rectifications, getOwnerList]);
  const departmentList = useMemo(() => getDepartmentList(), [rectifications, getDepartmentList]);

  const filteredTodos = useMemo(() => {
    const list = getFilteredRectifications();

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return list.filter(
        (r) =>
          r.folderName.toLowerCase().includes(keyword) ||
          r.auditorName.toLowerCase().includes(keyword) ||
          r.opinion.toLowerCase().includes(keyword) ||
          r.ownerName.toLowerCase().includes(keyword)
      );
    }
    return list;
  }, [rectifications, statusFilter, ownerFilter, departmentFilter, overdueFilter, searchKeyword, getFilteredRectifications]);

  const workbenchData = useMemo(() => {
    const activeTodos = filteredTodos.filter(
      (r) => r.status === 'pending' || r.status === 'processing'
    );

    const byOwner = new Map<string, Rectification[]>();
    activeTodos.forEach((r) => {
      if (!byOwner.has(r.ownerId)) {
        byOwner.set(r.ownerId, []);
      }
      byOwner.get(r.ownerId)!.push(r);
    });

    return Array.from(byOwner.entries()).map(([ownerId, items]) => {
      const ownerName = items[0].ownerName;
      const pending = items.filter((r) => r.status === 'pending').length;
      const processing = items.filter((r) => r.status === 'processing').length;
      const overdue = items.filter((r) => r.isOverdue).length;
      return { ownerId, ownerName, items, pending, processing, overdue };
    }).sort((a, b) => (b.overdue + b.pending) - (a.overdue + a.pending));
  }, [filteredTodos]);

  const stats = useMemo(() => {
    const total = rectifications.length;
    const pending = rectifications.filter((r) => r.status === 'pending').length;
    const processing = rectifications.filter((r) => r.status === 'processing').length;
    const completed = rectifications.filter((r) => r.status === 'completed').length;
    const overdue = rectifications.filter((r) => r.isOverdue).length;
    return { total, pending, processing, completed, overdue };
  }, [rectifications]);

  const handleOpenProcess = (id: string) => {
    setSelectedTodo(id);
    setProcessResult('');
    setUploadedFile(null);
    setShowProcessModal(true);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }
    const base64 = await fileToBase64(file);
    setUploadedFile({ name: file.name, size: file.size, base64 });
  };

  const handleConfirmProcess = () => {
    if (!selectedTodo || !processResult.trim()) return;
    if (uploadedFile) {
      const savedName = generateFileName('screenshot', uploadedFile.name);
      updateRectificationStatus(
        selectedTodo,
        'completed',
        processResult,
        savedName,
        uploadedFile.base64
      );
    } else {
      updateRectificationStatus(selectedTodo, 'completed', processResult);
    }
    setShowProcessModal(false);
    setSelectedTodo(null);
  };

  const handleStartProcessing = (id: string) => {
    updateRectificationStatus(id, 'processing');
  };

  const handlePreviewScreenshot = (fileName: string) => {
    const data = getScreenshot(fileName);
    if (data) {
      setPreviewScreenshot(data);
    } else {
      alert('截图文件暂不可用');
    }
  };

  const currentTodo = selectedTodo ? rectifications.find((r) => r.id === selectedTodo) : null;

  const clearAllFilters = () => {
    setStatusFilter('all');
    setOwnerFilter('');
    setDepartmentFilter('');
    setOverdueFilter('all');
    setSearchKeyword('');
  };

  const hasActiveFilters =
    statusFilter !== 'all' || ownerFilter !== '' || departmentFilter !== '' || overdueFilter !== 'all' || searchKeyword !== '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">待办中心</h1>
          <p className="mt-1 text-sm text-gray-500">管理和处理权限整改任务</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
              viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="w-4 h-4" />
            列表视图
          </button>
          <button
            onClick={() => setViewMode('workbench')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
              viewMode === 'workbench' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            负责人工作台
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">全部任务</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">处理中</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{stats.processing}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已完成</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className={cn(
          'rounded-xl border p-5',
          stats.overdue > 0 ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200' : 'bg-white border-gray-200'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">逾期未处理</p>
              <p className={cn('mt-2 text-3xl font-bold', stats.overdue > 0 ? 'text-red-600' : 'text-gray-400')}>
                {stats.overdue}
              </p>
            </div>
            <div className={cn('p-3 rounded-xl', stats.overdue > 0 ? 'bg-red-100' : 'bg-gray-50')}>
              <AlertTriangle className={cn('w-6 h-6', stats.overdue > 0 ? 'text-red-600' : 'text-gray-400')} />
            </div>
          </div>
          <p className={cn(
            'mt-3 text-xs',
            stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'
          )}>
            {stats.overdue > 0 ? '请重点跟进催办' : '暂无逾期任务'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
                      statusFilter === tab.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <tab.icon className={cn('w-4 h-4', tab.value === 'processing' && statusFilter === tab.value && 'animate-spin')} />
                    {tab.label}
                  </button>
                ))}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  清除所有筛选
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">全部负责人</option>
                  {ownerList.map((o) => (
                    <option key={o.id} value={o.name}>
                      {o.name} ({o.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">全部部门</option>
                  {departmentList.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-400" />
                <select
                  value={overdueFilter}
                  onChange={(e) => setOverdueFilter(e.target.value as 'all' | 'overdue' | 'not_overdue')}
                  className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部状态</option>
                  <option value="overdue">仅显示逾期</option>
                  <option value="not_overdue">未逾期</option>
                </select>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索文件夹、审计员、负责人..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="divide-y divide-gray-100">
            {filteredTodos.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无符合条件的任务</p>
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onProcess={handleOpenProcess}
                  onStartProcessing={handleStartProcessing}
                  onPreviewScreenshot={handlePreviewScreenshot}
                  onClickFolder={() => navigate(`/folder/${todo.folderId}`)}
                />
              ))
            )}
          </div>
        )}

        {viewMode === 'workbench' && (
          <div className="p-5">
            {workbenchData.length === 0 ? (
              <div className="py-16 text-center">
                <LayoutDashboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无待处理任务</p>
              </div>
            ) : (
              <div className="space-y-6">
                {workbenchData.map((wb) => (
                  <div key={wb.ownerId} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                            {wb.ownerName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{wb.ownerName}</h3>
                            <p className="text-xs text-gray-500">文件夹负责人</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">{wb.pending}</p>
                            <p className="text-xs text-gray-500">待处理</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{wb.processing}</p>
                            <p className="text-xs text-gray-500">处理中</p>
                          </div>
                          <div className="text-center">
                            <p className={cn(
                              'text-2xl font-bold',
                              wb.overdue > 0 ? 'text-red-600' : 'text-gray-400'
                            )}>
                              {wb.overdue}
                            </p>
                            <p className="text-xs text-gray-500">逾期</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {wb.items.map((todo) => (
                        <TodoRow
                          key={todo.id}
                          todo={todo}
                          onProcess={handleOpenProcess}
                          onStartProcessing={handleStartProcessing}
                          onPreviewScreenshot={handlePreviewScreenshot}
                          onClickFolder={() => navigate(`/folder/${todo.folderId}`)}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{filteredTodos.length}</span> 条记录
          </p>
        </div>
      </div>

      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="整改处理"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowProcessModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmProcess}
              disabled={!processResult.trim()}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                processResult.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              确认完成
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {currentTodo && (
            <div className={cn(
              'p-4 rounded-xl',
              currentTodo.isOverdue ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'
            )}>
              <p className={cn(
                'text-sm font-medium mb-1',
                currentTodo.isOverdue ? 'text-red-900' : 'text-blue-900'
              )}>
                {currentTodo.folderName} · 涉及 {currentTodo.memberIds.length} 人：{currentTodo.memberNames.join('、')}
              </p>
              <p className={cn('text-sm', currentTodo.isOverdue ? 'text-red-800' : 'text-blue-700')}>
                <span className="font-medium">整改要求：</span>{currentTodo.opinion}
              </p>
              <p className={cn('text-xs mt-2', currentTodo.isOverdue ? 'text-red-600' : 'text-blue-600')}>
                到期日期：{currentTodo.dueDate} {currentTodo.isOverdue && <span className="font-medium">（已逾期）</span>}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              处理结果 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={processResult}
              onChange={(e) => setProcessResult(e.target.value)}
              placeholder="请输入处理结果说明，例如：已移除外部人员访问权限；已将离职人员从用户组移除等..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              上传凭证截图
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />
            {!uploadedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">点击选择图片或拖拽到此区域</p>
                <p className="text-xs text-gray-400 mt-1">支持 PNG / JPG / GIF 格式，单张不超过 10MB</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="relative max-h-64 overflow-auto bg-gray-50 flex items-center justify-center p-4">
                  <img src={uploadedFile.base64} alt="预览" className="max-h-60 max-w-full rounded-md shadow-sm" />
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <FileImage className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{uploadedFile.name}</span>
                    <span className="text-gray-400">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
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
            <img src={previewScreenshot} alt="凭证" className="max-h-[60vh] max-w-full rounded-md shadow-md" />
          </div>
        )}
      </Modal>
    </div>
  );
}

function TodoRow({
  todo,
  onProcess,
  onStartProcessing,
  onPreviewScreenshot,
  onClickFolder,
  compact,
}: {
  todo: Rectification;
  onProcess: (id: string) => void;
  onStartProcessing: (id: string) => void;
  onPreviewScreenshot: (fileName: string) => void;
  onClickFolder: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'hover:bg-gray-50 transition-colors cursor-pointer group',
        todo.isOverdue && 'bg-red-50/30',
        compact ? 'px-5 py-4' : 'p-5'
      )}
      onClick={onClickFolder}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {todo.folderName}
            </h3>
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
                  onPreviewScreenshot(todo.screenshot!);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
              >
                <FileImage className="w-3 h-3" />
                查看凭证
              </button>
            )}
          </div>
          {!compact && (
            <>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {todo.opinion}
              </p>
              {todo.result && (
                <p className="mt-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                  <span className="font-medium">处理结果：</span>{todo.result}
                </p>
              )}
            </>
          )}
          <div className={cn('flex items-center gap-4 text-xs text-gray-400 flex-wrap', !compact ? 'mt-3' : 'mt-2')}>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              审计员：{todo.auditorName}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5" />
              负责人：{todo.ownerName}
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" />
              到期：{todo.dueDate}
            </span>
            {!compact && (
              <>
                <span>涉及 {todo.memberIds.length} 名成员：{todo.memberNames.join('、')}</span>
                <span>发起：{todo.createdAt}</span>
                {todo.completedAt && <span>完成：{todo.completedAt}</span>}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {todo.status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartProcessing(todo.id);
                }}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                开始处理
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onProcess(todo.id);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
              >
                处理
              </button>
            </>
          )}
          {todo.status === 'processing' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProcess(todo.id);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
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
