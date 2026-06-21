import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  UserX,
  Users,
  Clock,
  ChevronDown,
  ArrowUpDown,
  FolderOpen,
  Building2,
  CalendarClock,
} from 'lucide-react';
import { useFolderStore } from '@/store/useFolderStore';
import type { RiskType } from '@/types';
import { RiskTypeTag, RiskLevelTag } from '@/components/RiskTag';
import { riskTypeLabels } from '@/utils/format';
import { cn } from '@/lib/utils';

const riskCardConfig = [
  { type: 'external_access' as RiskType, label: '外部可访问', icon: AlertTriangle, color: 'from-red-500 to-rose-600', bgColor: 'bg-red-50', textColor: 'text-red-600' },
  { type: 'resigned_access' as RiskType, label: '离职人员有权限', icon: UserX, color: 'from-orange-500 to-amber-600', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  { type: 'too_many_editors' as RiskType, label: '可编辑人数过多', icon: Users, color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
  { type: 'long_unaccessed' as RiskType, label: '长期未访问', icon: Clock, color: 'from-gray-500 to-slate-600', bgColor: 'bg-gray-50', textColor: 'text-gray-600' },
];

const departments = ['', '技术部', '行政部', '财务部', '市场部', '法务部', '销售部', '采购部', '总经办'];

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

  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">风险清单</h1>
          <p className="mt-1 text-sm text-gray-500">按风险等级排序，优先处理高风险文件夹</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            导出清单
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            开始全面审计
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
              {filteredFolders.map((folder) => (
                <tr
                  key={folder.id}
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/folder/${folder.id}`)}
                >
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{filteredFolders.length}</span> 个文件夹
          </p>
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
    </div>
  );
}
