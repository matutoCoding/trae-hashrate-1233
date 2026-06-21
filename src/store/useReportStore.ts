import { create } from 'zustand';
import type { AuditReport, DepartmentStat, ProjectStat, FolderStat, ReportDimension, DrillState } from '@/types';
import { folders } from '@/data/folders';
import { membersByFolder } from '@/data/members';

interface ReportState {
  period: string;
  dimension: ReportDimension;
  selectedDepartment: string;
  drill: DrillState;
  setPeriod: (period: string) => void;
  setDimension: (dimension: ReportDimension) => void;
  setSelectedDepartment: (dept: string) => void;
  setDrill: (drill: DrillState) => void;
  resetDrill: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  period: '2025年6月',
  dimension: 'department',
  selectedDepartment: '',
  drill: { level: 'overview' },

  setPeriod: (period) => set({ period }),
  setDimension: (dimension) => set({ dimension, drill: { level: 'overview' } }),
  setSelectedDepartment: (dept) => set({ selectedDepartment: dept }),

  setDrill: (drill) => set({ drill }),

  resetDrill: () => set({ drill: { level: 'overview' } }),
}));

const computeBaseIssues = (folderId: string) => {
  const folder = folders.find((f) => f.id === folderId);
  const members = membersByFolder[folderId] || [];
  if (!folder) return { total: 0 };
  const riskyMembers = members.filter((m) => m.isExternal || m.isResigned).length;
  const total = folder.riskTypes.length * 2 + riskyMembers;
  return { total, riskyMembers, riskCount: folder.riskTypes.length };
};

export function computeAuditReport(
  period: string,
  deptStatsComputed: Record<string, { total: number; resolved: number; pending: number; processing: number; overdue: number }>
): AuditReport {
  if (Object.keys(deptStatsComputed).length === 0) {
    folders.forEach((folder) => {
      if (!deptStatsComputed[folder.department]) {
        deptStatsComputed[folder.department] = { total: 0, resolved: 0, pending: 0, processing: 0, overdue: 0 };
      }
    });
    Object.keys(deptStatsComputed).forEach((dept) => {
      const s = deptStatsComputed[dept];
      s.resolved = Math.floor(s.total * 0.45);
      s.pending = s.total - s.resolved;
      s.processing = 0;
      s.overdue = 0;
    });
  }

  const departmentStats: DepartmentStat[] = Object.entries(deptStatsComputed).map(([name, stats]) => ({
    name,
    totalIssues: stats.total,
    resolved: stats.resolved,
    pending: stats.pending,
    processing: stats.processing || 0,
    overdue: stats.overdue || 0,
    rectificationIds: [],
  }));

  const projectMap = new Map<string, { dept: string; total: number; resolved: number; pending: number; processing: number; overdue: number }>();
  folders.forEach((folder) => {
    const key = folder.project;
    const base = computeBaseIssues(folder.id);
    const deptName = folder.department;
    const deptStat = deptStatsComputed[deptName] || {
      total: base.total,
      resolved: Math.floor(base.total * 0.5),
      pending: Math.ceil(base.total * 0.5),
      processing: 0,
      overdue: 0,
    };
    const factor = deptStat.total > 0 ? deptStat.resolved / deptStat.total : 0.45;

    if (projectMap.has(key)) {
      const cur = projectMap.get(key)!;
      cur.total += base.total;
      cur.resolved += Math.floor(base.total * factor);
      cur.pending += Math.ceil(base.total * (1 - factor));
    } else {
      projectMap.set(key, {
        dept: folder.department,
        total: base.total,
        resolved: Math.floor(base.total * factor),
        pending: Math.ceil(base.total * (1 - factor)),
        processing: 0,
        overdue: 0,
      });
    }
  });

  const projectStats: ProjectStat[] = Array.from(projectMap.entries()).map(([name, stats]) => ({
    name,
    department: stats.dept,
    totalIssues: stats.total,
    resolved: stats.resolved,
    pending: stats.pending,
    processing: stats.processing || 0,
    overdue: stats.overdue || 0,
    rectificationIds: [],
  }));

  const folderStats: FolderStat[] = folders.map((folder) => {
    const base = computeBaseIssues(folder.id);
    const deptStat = deptStatsComputed[folder.department];
    const factor = deptStat && deptStat.total > 0 ? deptStat.resolved / deptStat.total : 0.45;
    const resolved = Math.floor(base.total * factor);
    return {
      name: folder.name,
      department: folder.department,
      project: folder.project,
      folderId: folder.id,
      totalIssues: base.total,
      resolved,
      pending: base.total - resolved,
      processing: 0,
      overdue: 0,
      rectificationIds: [],
    };
  });

  const totalIssues = departmentStats.reduce((sum, d) => sum + d.totalIssues, 0);
  const resolved = departmentStats.reduce((sum, d) => sum + d.resolved, 0);
  const pending = departmentStats.reduce((sum, d) => sum + d.pending, 0);
  const processing = departmentStats.reduce((sum, d) => sum + d.processing, 0);
  const overdue = departmentStats.reduce((sum, d) => sum + d.overdue, 0);

  return {
    period,
    totalIssues,
    resolved,
    pending,
    processing,
    overdue,
    completionRate: totalIssues > 0 ? Math.round((resolved / totalIssues) * 100) : 0,
    departmentStats,
    projectStats,
    folderStats,
  };
}
