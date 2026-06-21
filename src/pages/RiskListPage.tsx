import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  UserX,
  Users,
  Clock,
  ChevronDown,
  FolderOpen,
  Building2,
  CalendarClock,
  Shield,
  Loader2,
  Download,
  X,
} from 'lucide-react';
import { useFolderStore } from '@/store/useFolderStore';
import { useRectificationStore } from '@/store/useRectificationStore';
import { membersByFolder } from '@/data/members';
import type { Folder, Member, RiskType } from '@/types';
import { RiskTypeTag, RiskLevelTag } from '@/components/RiskTag';
import { riskTypeLabels } from '@/utils/format';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import { exportRiskListExcel } from '@/utils/export';

const riskCardConfig = [
  { type: 'external_access' as RiskType, label: '外部可访问', icon: AlertTriangle, color: 'from-red-500 to-rose-600', bgColor: 'bg-red-50', textColor: 'text-red-600' },
  { type: 'resigned_access' as RiskType, label: '离职人员有权限', icon: UserX, color: 'from-orange-500 to-amber-600', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  { type: 'too_many_editors' as RiskType, label: '可编辑人数过多', icon: Users, color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
  { type: 'long_unaccessed' as RiskType, label: '长期未访问', icon: Clock, color: 'from-gray-500 to-slate-600', bgColor: 'bg-gray-50', textColor: 'text-gray-600' },
];

const departments = ['', '技术部', '行政部', '财务部', '市场部', '法务部', '销售部', '采购部', '总经办'];

interface BatchFolderDetail {
  folder: Folder;
  riskyMembers: Member[];
  selectedMemberIds: string[];
  allSelected: boolean;
}

export default function RiskListPage() {
  const navigate = useNavigate();
  const {
    folders,
    selectedRiskTypes,
    selectedDepartment,
    sortBy,
    setSelectedRiskTypes,
    setSelectedDepartment,
    setSortBy,
    getFilteredFolders,
  } = useFolderStore();
  const {
    batchAddRectifications,
    initialize,
  } = useRectificationStore();

  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDetails, setBatchDetails] = useState<BatchFolderDetail[]>([]);
  const [batchOpinion, setBatchOpinion] = useState('季度内控检查：请清理文件夹内外部/离职人员访问权限，调整后上传截图确认');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filteredFolders = useMemo(() => getFilteredFolders(), [getFilteredFolders]);

  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = {
      external_access: 0,
      resigned_access: 0,
      too_many_editors: 0,
      long_unaccessed: 0,
    };
    folders.forEach((f) => {
      f.riskTypes.forEach((type) => {
        counts[type]++;
      });
    });
    return counts;
  }, [folders]);

  const toggleRiskType = (type: RiskType) => {
    if (selectedRiskTypes.includes(type)) {
      setSelectedRiskTypes(selectedRiskTypes.filter((t) => t !== type));
    } else {
      setSelectedRiskTypes([...selectedRiskTypes, type]);
    }
  };

  const toggleFolderSelect = (folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedFolderIds.includes(folderId)) {
      setSelectedFolderIds(selectedFolderIds.filter((id) => id !== folderId));
    } else {
      setSelectedFolderIds([...selectedFolderIds, folderId]);
    }
  };

  const toggleAllFiltered = (checked: boolean) => {
    if (checked) {
      setSelectedFolderIds(filteredFolders.map((f) => f.id));
    } else {
      setSelectedFolderIds([]);
    }
  };

  const openBatchModal = () => {
    const selectedFolders = filteredFolders.filter((f) => selectedFolderIds.includes(f.id));
    const details: BatchFolderDetail[] = selectedFolders.map((folder) => {
      const members = membersByFolder[folder.id] || [];
      const riskyMembers = members.filter((m) => m.isExternal || m.isResigned);
      const selectedMemberIds = riskyMembers.map((m) => m.id);
      return {
        folder,
        riskyMembers,
        selectedMemberIds,
        allSelected: riskyMembers.length > 0,
      };
    });
    setBatchDetails(details);
    setShowBatchModal(true);
  };

  const toggleMemberInFolder = (folderId: string, memberId: string) => {
    setBatchDetails((prev) =>
      prev.map((d) =>
        d.folder.id === folderId
          ? {
              ...d,
              selectedMemberIds: d.selectedMemberIds.includes(memberId)
                ? d.selectedMemberIds.filter((id) => id !== memberId)
                : [...d.selectedMemberIds, memberId],
              allSelected: false,
            }
          : d
      )
    );
  };

  const toggleAllMembersInFolder = (folderId: string, checked: boolean) => {
    setBatchDetails((prev) =>
      prev.map((d) =>
        d.folder.id === folderId
          ? {
              ...d,
              selectedMemberIds: checked ? d.riskyMembers.map((m) => m.id) : [],
              allSelected: checked,
            }
          : d
      )
    );
  };

  const totalMembersSelectedInBatch = useMemo(
    () => batchDetails.reduce((sum, d) => sum + d.selectedMemberIds.length, 0),
    [batchDetails]
  );

  const handleConfirmBatch = async () => {
    if (totalMembersSelectedInBatch === 0 || !batchOpinion.trim()) return;
    setIsCreatingBatch(true);

    const tasks = batchDetails
      .filter((d) => d.selectedMemberIds.length > 0)
      .map((d) => {
        const selectedMembers = d.riskyMembers.filter((m) => d.selectedMemberIds.includes(m.id));
        return {
          folderId: d.folder.id,
          folderName: d.folder.name,
          auditorId: 'auditor1',
          auditorName: '审计员张三',
          ownerId: d.folder.ownerId,
          ownerName: d.folder.ownerName,
          memberIds: d.selectedMemberIds,
          memberNames: selectedMembers.map((m) => m.name),
          actionType: 'revoke_permission',
          opinion: batchOpinion,
        };
      });

    batchAddRectifications(tasks);

    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsCreatingBatch(false);
    setShowBatchModal(false);
    setSelectedFolderIds([]);
    setBatchDetails([]);
    alert(`已成功创建 ${tasks.length} 条整改任务，涉及 ${totalMembersSelectedInBatch} 名成员\n可在「待办中心」查看并处理`);
  };

  const handleExportRiskList = async () => {
    setExporting(true);
    try {
      await exportRiskListExcel(filteredFolders);
    } catch (err) {
      console.error(err);
      alert('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const allFilteredSelected =
    filteredFolders.length > 0 && selectedFolderIds.length === filteredFolders.length;
  const someFilteredSelected =
    selectedFolderIds.length > 0 && !allFilteredSelected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">风险清单</h1>
          <p className="mt-1 text-sm text-gray-500">按风险等级排序，优先处理高风险文件夹</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportRiskList}
            disabled={exporting}
            className={cn(
              'px-4 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center gap-2',
              exporting
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            )}
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? '导出中...' : '导出清单'}
          </button>
          <button
            onClick={openBatchModal}
            disabled={selectedFolderIds.length === 0}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm',
              selectedFolderIds.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            <Shield className="w-4 h-4" />
            批量整改
            {selectedFolderIds.length > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {selectedFolderIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {riskCardConfig.map((card) => {
          const isSelected = selectedRiskTypes.includes(card.type);
          return (
            <div
              key={card.type}
              onClick={() => toggleRiskType(card.type)}
              className={cn(
                'relative overflow-hidden rounded-xl p-5 cursor-pointer transition-all duration-300',
                isSelected
                  ? 'bg-white ring-2 ring-blue-500 shadow-lg scale-[1.02]'
                  : 'bg-white hover:shadow-md border border-gray-100'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{riskCounts[card.type]}</p>
                  <p className="mt-1 text-xs text-gray-400">个文件夹</p>
                </div>
                <div className={cn('p-3 rounded-xl bg-gradient-to-br', card.color)}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                {selectedDepartment || '全部部门'}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showDeptDropdown && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {departments.map((dept) => (
                    <button
                      key={dept || 'all'}
                      onClick={() => {
                        setSelectedDepartment(dept);
                        setShowDeptDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors',
                        selectedDepartment === dept && 'text-blue-600 bg-blue-50'
                      )}
                    >
                      {dept || '全部部门'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {Object.entries(riskTypeLabels).map(([key, label]) => {
                const type = key as RiskType;
                const isActive = selectedRiskTypes.includes(type);
                return (
                  <button
                    key={key}
                    onClick={() => toggleRiskType(type)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">排序：</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { value: 'riskLevel', label: '风险等级' },
                { value: 'memberCount', label: '成员数' },
                { value: 'lastAccessed', label: '最近访问' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setSortBy(item.value as 'riskLevel' | 'memberCount' | 'lastAccessed')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    sortBy === item.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={(e) => toggleAllFiltered(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件夹名称
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  所属部门
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  风险类型
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  风险等级
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    成员数
                  </div>
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    最近访问
                  </div>
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  负责人
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFolders.map((folder) => {
                const isChecked = selectedFolderIds.includes(folder.id);
                return (
                  <tr
                    key={folder.id}
                    className={cn(
                      'hover:bg-blue-50/30 transition-colors cursor-pointer group',
                      isChecked && 'bg-blue-50/50'
                    )}
                    onClick={() => navigate(`/folder/${folder.id}`)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleFolderSelect(folder.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {folder.name}
                          </p>
                          <p className="text-xs text-gray-400">{folder.path}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{folder.department}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {folder.riskTypes.map((type) => (
                          <RiskTypeTag key={type} type={type} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <RiskLevelTag level={folder.riskLevel} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-900">{folder.memberCount}</span>
                      <span className="text-xs text-gray-400 ml-1">人</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{folder.lastAccessed}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {folder.ownerName.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{folder.ownerName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        查看详情 →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              共 <span className="font-medium text-gray-900">{filteredFolders.length}</span> 个文件夹
              {selectedFolderIds.length > 0 && (
                <span className="text-blue-600 ml-3">
                  已选 <span className="font-medium">{selectedFolderIds.length}</span> 项
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">
              上一页
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md">1</span>
            <button className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
              下一页
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showBatchModal}
        onClose={() => !isCreatingBatch && setShowBatchModal(false)}
        title="批量发起整改"
        size="xl"
        footer={
          <>
            <button
              onClick={() => setShowBatchModal(false)}
              disabled={isCreatingBatch}
              className={cn(
                'px-4 py-2 text-sm font-medium border rounded-lg transition-colors',
                isCreatingBatch
                  ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              )}
            >
              取消
            </button>
            <button
              onClick={handleConfirmBatch}
              disabled={isCreatingBatch || totalMembersSelectedInBatch === 0 || !batchOpinion.trim()}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                !isCreatingBatch && totalMembersSelectedInBatch > 0 && batchOpinion.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {isCreatingBatch ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {isCreatingBatch
                ? '创建中...'
                : `确认创建 ${batchDetails.filter((d) => d.selectedMemberIds.length > 0).length} 条整改任务`}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-1">
              <Shield className="w-4 h-4" />
              批量整改说明
            </div>
            <p className="text-sm text-blue-700">
              已选择 <span className="font-bold">{batchDetails.length}</span> 个文件夹，
              系统自动识别到 <span className="font-bold">{batchDetails.reduce((s, d) => s + d.riskyMembers.length, 0)}</span> 名
              高风险成员（外部/离职人员），默认全部勾选。调整后将为每个文件夹独立创建整改任务，发送至文件夹负责人。
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              统一处理意见
            </label>
            <textarea
              value={batchOpinion}
              onChange={(e) => setBatchOpinion(e.target.value)}
              placeholder="请输入本次批量整改的统一要求..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                各文件夹风险成员确认
              </label>
              <span className="text-xs text-gray-500">
                已选成员 <span className="font-medium text-blue-600">{totalMembersSelectedInBatch}</span> 人
              </span>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {batchDetails.map((detail) => (
                <div
                  key={detail.folder.id}
                  className={cn(
                    'border rounded-xl p-4 transition-colors',
                    detail.selectedMemberIds.length > 0
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{detail.folder.name}</p>
                          <RiskLevelTag level={detail.folder.riskLevel} size="sm" />
                        </div>
                        <p className="text-xs text-gray-500">
                          {detail.folder.department} · {detail.folder.project} · 负责人 {detail.folder.ownerName}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={detail.allSelected && detail.riskyMembers.length > 0}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              detail.selectedMemberIds.length > 0 &&
                              detail.selectedMemberIds.length < detail.riskyMembers.length;
                          }
                        }}
                        onChange={(e) => toggleAllMembersInFolder(detail.folder.id, e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      全选
                    </label>
                  </div>
                  {detail.riskyMembers.length === 0 ? (
                    <div className="text-sm text-gray-400 py-2 text-center bg-gray-50 rounded-lg">
                      该文件夹未识别到外部/离职人员，可在详情页手动选择成员发起
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {detail.riskyMembers.map((member) => {
                        const checked = detail.selectedMemberIds.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            className={cn(
                              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-all',
                              checked
                                ? 'bg-blue-50 border-blue-400 text-blue-800'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMemberInFolder(detail.folder.id, member.id)}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-xs text-white font-medium">
                              {member.name.charAt(0)}
                            </span>
                            <span className="font-medium">{member.name}</span>
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px]',
                                member.isExternal
                                  ? 'bg-orange-100 text-orange-600'
                                  : 'bg-gray-200 text-gray-600'
                              )}
                            >
                              {member.isExternal ? '外部' : '离职'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
