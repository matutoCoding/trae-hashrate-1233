import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  FolderOpen,
  Users,
  Calendar,
  HardDrive,
  User,
  Shield,
  Clock,
  Link2,
  UserX,
  AlertCircle,
  CheckCircle,
  Send,
  FileText,
  Image as ImageIcon,
  Building2,
  FileImage,
  Download,
} from 'lucide-react';
import { useFolderStore } from '@/store/useFolderStore';
import { useRectificationStore } from '@/store/useRectificationStore';
import type { Member } from '@/types';
import { RiskTypeTag, RiskLevelTag } from '@/components/RiskTag';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { roleLabels, formatFileSize } from '@/utils/format';
import { cn } from '@/lib/utils';
import { getScreenshot } from '@/utils/storage';
import { exportMembersExcel } from '@/utils/export';

const actionTypes = [
  { value: 'revoke_permission', label: '收回权限' },
  { value: 'change_to_viewer', label: '改为仅查看' },
  { value: 'verify_identity', label: '身份核实' },
  { value: 'other', label: '其他处理' },
];

export default function FolderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFolderById, getMembersByFolderId } = useFolderStore();
  const { getRectificationsByFolderId, addRectification, initialize } = useRectificationStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const folder = getFolderById(id);
  const members = getMembersByFolderId(id);
  const rectifications = getRectificationsByFolderId(id);

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showRectifyModal, setShowRectifyModal] = useState(false);
  const [actionType, setActionType] = useState('revoke_permission');
  const [opinion, setOpinion] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'records'>('members');
  const [previewScreenshot, setPreviewScreenshot] = useState<{ name: string; data: string } | null>(null);

  const selectedMembersData = useMemo(
    () => members.filter((m) => selectedMembers.includes(m.id)),
    [members, selectedMembers]
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(members.map((m) => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, memberId]);
    } else {
      setSelectedMembers(selectedMembers.filter((mid) => mid !== memberId));
    }
  };

  const handleSubmitRectification = () => {
    if (!folder || selectedMembers.length === 0 || !opinion.trim()) return;

    addRectification({
      folderId: folder.id,
      folderName: folder.name,
      auditorId: 'auditor1',
      auditorName: '审计员张三',
      ownerId: folder.ownerId,
      ownerName: folder.ownerName,
      memberIds: selectedMembers,
      memberNames: selectedMembersData.map((m) => m.name),
      actionType,
      opinion,
    });

    setShowRectifyModal(false);
    setSelectedMembers([]);
    setOpinion('');
  };

  const handlePreviewScreenshot = (fileName: string) => {
    const data = getScreenshot(fileName);
    if (data) {
      setPreviewScreenshot({ name: fileName, data });
    } else {
      alert('截图凭证尚未保存或已丢失');
    }
  };

  const handleExportMembers = () => {
    if (!folder) return;
    exportMembersExcel(folder.name, members);
  };

  if (!folder) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">文件夹不存在</p>
      </div>
    );
  }

  const infoItems = [
    { icon: FolderOpen, label: '文件夹路径', value: folder.path },
    { icon: Building2, label: '所属部门', value: folder.department },
    { icon: FileText, label: '所属项目', value: folder.project },
    { icon: User, label: '文件夹负责人', value: folder.ownerName },
    { icon: Calendar, label: '创建时间', value: folder.createdAt },
    { icon: HardDrive, label: '总容量', value: formatFileSize(folder.size) },
    { icon: Users, label: '成员总数', value: `${folder.memberCount} 人` },
    { icon: Clock, label: '最近访问', value: folder.lastAccessed },
  ];

  const resolvedCount = rectifications.filter((r) => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{folder.name}</h1>
            <RiskLevelTag level={folder.riskLevel} />
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              整改：{resolvedCount}/{rectifications.length} 已完成
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {folder.riskTypes.map((type) => (
              <RiskTypeTag key={type} type={type} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportMembers}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出成员列表
          </button>
          <button
            onClick={() => setShowRectifyModal(true)}
            disabled={selectedMembers.length === 0}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
              selectedMembers.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            <Shield className="w-4 h-4" />
            发起整改
            {selectedMembers.length > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {selectedMembers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {infoItems.slice(0, 4).map((item, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <item.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              成员权限
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{members.length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'records'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              整改记录
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{rectifications.length}</span>
            </div>
          </button>
        </div>

        {activeTab === 'members' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedMembers.length === members.length && members.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    成员
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    角色
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    授权来源
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    最近访问
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    selected={selectedMembers.includes(member.id)}
                    onSelect={(checked) => handleSelectMember(member.id, checked)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="p-6">
            {rectifications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无整改记录</p>
                <p className="mt-1 text-xs text-gray-400">在「成员权限」Tab 勾选成员后发起整改</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rectifications.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-900">
                              {record.actionType === 'revoke_permission' ? '收回权限' :
                               record.actionType === 'change_to_viewer' ? '改为仅查看' :
                               record.actionType === 'verify_identity' ? '身份核实' : '其他处理'}
                            </h4>
                            <StatusBadge status={record.status} />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            审计员：{record.auditorName} · 发起时间：{record.createdAt}
                          </p>
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">处理意见：</span>
                              {record.opinion}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">涉及成员：</span>
                              {record.memberNames.join('、')}
                            </p>
                          </div>
                          {record.result && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">处理结果：</span>
                                {record.result}
                              </p>
                              {record.screenshot && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => handlePreviewScreenshot(record.screenshot!)}
                                    className="inline-flex items-center gap-2 p-2 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                                  >
                                    <FileImage className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-700 font-medium">
                                      查看凭证（{record.screenshot.split('_').pop()}）
                                    </span>
                                  </button>
                                </div>
                              )}
                              {record.completedAt && (
                                <p className="text-xs text-gray-500 mt-2">
                                  完成时间：{record.completedAt} · 负责人：{record.ownerName}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showRectifyModal}
        onClose={() => setShowRectifyModal(false)}
        title="发起整改申请"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowRectifyModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmitRectification}
              disabled={selectedMembers.length === 0 || !opinion.trim()}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                selectedMembers.length > 0 && opinion.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
              提交整改
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              处理类型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {actionTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setActionType(type.value)}
                  className={cn(
                    'px-4 py-2.5 text-sm rounded-lg border transition-all text-left',
                    actionType === type.value
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              涉及成员 ({selectedMembersData.length} 人)
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
              {selectedMembersData.length === 0 ? (
                <span className="text-sm text-gray-400">请在列表中选择成员</span>
              ) : (
                selectedMembersData.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-sm"
                  >
                    <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600">
                      {m.name.charAt(0)}
                    </span>
                    {m.name}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              处理意见
            </label>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              placeholder="请输入整改意见和具体要求..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">整改意见将发送给文件夹负责人：{folder.ownerName}，并同步到待办中心</p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!previewScreenshot}
        onClose={() => setPreviewScreenshot(null)}
        title="整改凭证截图"
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

function MemberRow({ member, selected, onSelect }: { member: Member; selected: boolean; onSelect: (checked: boolean) => void }) {
  return (
    <tr className={cn('hover:bg-blue-50/30 transition-colors', selected && 'bg-blue-50/50')}>
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium',
              member.isExternal
                ? 'bg-gradient-to-br from-orange-400 to-red-500'
                : member.isResigned
                ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                : 'bg-gradient-to-br from-blue-400 to-blue-600'
            )}
          >
            {member.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{member.name}</p>
              {member.isExternal && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">
                  <Link2 className="w-3 h-3" />
                  外部
                </span>
              )}
              {member.isResigned && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  <UserX className="w-3 h-3" />
                  离职
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{member.department}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full',
            member.role === 'owner' && 'bg-purple-100 text-purple-700',
            member.role === 'editor' && 'bg-blue-100 text-blue-700',
            member.role === 'viewer' && 'bg-gray-100 text-gray-600',
            member.role === 'commenter' && 'bg-green-100 text-green-700'
          )}
        >
          {roleLabels[member.role]}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm text-gray-600">{member.accessSource}</span>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm text-gray-600">{member.lastAccess}</span>
      </td>
      <td className="px-5 py-4">
        {member.status === 'active' ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            正常
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
            <AlertCircle className="w-4 h-4" />
            异常
          </span>
        )}
      </td>
    </tr>
  );
}
