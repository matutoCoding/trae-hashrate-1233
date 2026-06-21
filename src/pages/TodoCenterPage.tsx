import { useState, useMemo } from 'react';
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
  Filter,
  Search,
  Send,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { useRectificationStore } from '@/store/useRectificationStore';
import type { RectificationStatus } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import { statusLabels } from '@/utils/format';

const statusTabs: { value: RectificationStatus | 'all'; label: string; icon: typeof Clock }[] = [
  { value: 'all', label: '全部', icon: ClipboardList },
  { value: 'pending', label: '待处理', icon: Clock },
  { value: 'processing', label: '处理中', icon: Loader2 },
  { value: 'completed', label: '已完成', icon: CheckCircle2 },
  { value: 'cancelled', label: '已取消', icon: XCircle },
];

export default function TodoCenterPage() {
  const navigate = useNavigate();
  const { rectifications, statusFilter, setStatusFilter, updateRectificationStatus } =
    useRectificationStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState('');
  const [hasScreenshot, setHasScreenshot] = useState(false);

  const filteredTodos = useMemo(() => {
    let result = statusFilter === 'all' ? rectifications : rectifications.filter((r) => r.status === statusFilter);

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (r) =>
          r.folderName.toLowerCase().includes(keyword) ||
          r.auditorName.toLowerCase().includes(keyword) ||
          r.opinion.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [rectifications, statusFilter, searchKeyword]);

  const handleOpenProcess = (id: string) => {
    setSelectedTodo(id);
    setProcessResult('');
    setHasScreenshot(false);
    setShowProcessModal(true);
  };

  const handleConfirmProcess = () => {
    if (!selectedTodo || !processResult.trim()) return;

    updateRectificationStatus(
      selectedTodo,
      'completed',
      processResult,
      hasScreenshot ? 'screenshot_uploaded.png' : undefined
    );

    setShowProcessModal(false);
    setSelectedTodo(null);
  };

  const stats = useMemo(() => {
    const total = rectifications.length;
    const pending = rectifications.filter((r) => r.status === 'pending').length;
    const processing = rectifications.filter((r) => r.status === 'processing').length;
    const completed = rectifications.filter((r) => r.status === 'completed').length;
    return { total, pending, processing, completed };
  }, [rectifications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">待办中心</h1>
          <p className="mt-1 text-sm text-gray-500">管理和处理权限整改任务</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
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
              <Loader2 className="w-6 h-6 text-blue-600" />
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
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-100">
          <div className="flex items-center justify-between px-5 py-3">
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索文件夹、审计员..."
                className="w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredTodos.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无{statusFilter === 'all' ? '' : statusLabels[statusFilter]}任务</p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/folder/${todo.folderId}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {todo.folderName}
                      </h3>
                      <StatusBadge status={todo.status} />
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {todo.opinion}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        审计员：{todo.auditorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5" />
                        负责人：{todo.ownerName}
                      </span>
                      <span>涉及 {todo.memberIds.length} 名成员</span>
                      <span>发起时间：{todo.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {(todo.status === 'pending' || todo.status === 'processing') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProcess(todo.id);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        处理
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{filteredTodos.length}</span> 条记录
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
              上一页
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md">1</span>
            <button className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
              下一页
            </button>
          </div>
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
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm font-medium text-blue-900">整改要求</p>
            <p className="text-sm text-blue-700 mt-1">
              {rectifications.find((r) => r.id === selectedTodo)?.opinion || ''}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              处理结果
            </label>
            <textarea
              value={processResult}
              onChange={(e) => setProcessResult(e.target.value)}
              placeholder="请输入处理结果说明..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              上传凭证截图
            </label>
            <div
              onClick={() => setHasScreenshot(!hasScreenshot)}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                hasScreenshot
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {hasScreenshot ? (
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-700">screenshot.png</p>
                  <p className="text-xs text-green-500 mt-1">点击重新上传</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">点击或拖拽上传截图</p>
                  <p className="text-xs text-gray-400 mt-1">支持 PNG、JPG 格式，大小不超过 5MB</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
