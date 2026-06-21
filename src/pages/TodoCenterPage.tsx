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
  Send,
  Image as ImageIcon,
  Upload,
  X,
  FileImage,
} from 'lucide-react';
import { useRectificationStore } from '@/store/useRectificationStore';
import type { RectificationStatus } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import { statusLabels } from '@/utils/format';
import { fileToBase64, generateFileName, getScreenshot } from '@/utils/storage';

const statusTabs: { value: RectificationStatus | 'all'; label: string; icon: typeof Clock }[] = [
  { value: 'all', label: '全部', icon: ClipboardList },
  { value: 'pending', label: '待处理', icon: Clock },
  { value: 'processing', label: '处理中', icon: Loader2 },
  { value: 'completed', label: '已完成', icon: CheckCircle2 },
  { value: 'cancelled', label: '已取消', icon: XCircle },
];

export default function TodoCenterPage() {
  const navigate = useNavigate();
  const {
    rectifications,
    statusFilter,
    setStatusFilter,
    getFilteredRectifications,
    updateRectificationStatus,
    initialize,
  } = useRectificationStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; base64: string } | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTodos = useMemo(() => {
    const list = statusFilter === 'all' ? rectifications : rectifications.filter((r) => r.status === statusFilter);

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return list.filter(
        (r) =>
          r.folderName.toLowerCase().includes(keyword) ||
          r.auditorName.toLowerCase().includes(keyword) ||
          r.opinion.toLowerCase().includes(keyword)
      );
    }
    return [...list].sort((a, b) => {
      const order = { pending: 0, processing: 1, cancelled: 2, completed: 3 } as const;
      return order[a.status] - order[b.status];
    });
  }, [rectifications, statusFilter, searchKeyword]);

  const stats = useMemo(() => {
    const total = rectifications.length;
    const pending = rectifications.filter((r) => r.status === 'pending').length;
    const processing = rectifications.filter((r) => r.status === 'processing').length;
    const completed = rectifications.filter((r) => r.status === 'completed').length;
    return { total, pending, processing, completed };
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
                      {todo.screenshot && todo.status === 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewScreenshot(todo.screenshot!);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        >
                          <FileImage className="w-3 h-3" />
                          查看凭证
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {todo.opinion}
                    </p>
                    {todo.result && (
                      <p className="mt-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                        <span className="font-medium">处理结果：</span>{todo.result}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        审计员：{todo.auditorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5" />
                        负责人：{todo.ownerName}
                      </span>
                      <span>涉及 {todo.memberIds.length} 名成员：{todo.memberNames.join('、')}</span>
                      <span>发起时间：{todo.createdAt}</span>
                      {todo.completedAt && (
                        <span>完成时间：{todo.completedAt}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {todo.status === 'pending' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartProcessing(todo.id);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          开始处理
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProcess(todo.id);
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
                          handleOpenProcess(todo.id);
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
            ))
          )}
        </div>

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
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm font-medium text-blue-900 mb-1">
                {currentTodo.folderName} · 涉及 {currentTodo.memberIds.length} 人：{currentTodo.memberNames.join('、')}
              </p>
              <p className="text-sm text-blue-700">
                <span className="font-medium">整改要求：</span>{currentTodo.opinion}
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
