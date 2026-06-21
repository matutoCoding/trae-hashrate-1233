import { create } from 'zustand';
import type { AuditReport, DepartmentStat, ProjectStat, FolderStat, ReportDimension } from '@/types';
import { folders } from '@/data/folders';
import { membersByFolder } from '@/data/members';

interface ReportState {
  period: string;
  dimension: ReportDimension;
  selectedDepartment: string;
  setPeriod: (period: string) => void;
  setDimension: (dimension: ReportDimension) => void;
  setSelectedDepartment: (dept: string) => void;
}

export const useReportStore = create<ReportState>((set) => ({
  period: '2025年6月',
  dimension: 'department',
  selectedDepartment: '',

  setPeriod: (period) => set({ period }),

  setDimension: (dimension) => set({ dimension }),

  setSelectedDepartment: (dept) => set({ selectedDepartment: dept }),
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
  deptStatsComputed: Record<string, { total: number; resolved: number; pending: number }>
): AuditReport {
  // Fallback computation if stats are empty
  if (Object.keys(deptStatsComputed).length === 0) {
    folders.forEach((folder) => {
      if (!deptStatsComputed[folder.department]) {
        deptStatsComputed[folder.department] = { total: 0, resolved: 0, pending: 0 };
      }
      const base = computeBaseIssues(folder.id);
      deptStatsComputed[folder.department].total += base.total;
    });
    Object.keys(deptStatsComputed).forEach((dept) => {
      const s = deptStatsComputed[dept];
      s.resolved = Math.floor(s.total * 0.45);
      s.pending = s.total - s.resolved;
    });
  }

  const departmentStats: DepartmentStat[] = Object.entries(deptStatsComputed).map(([name, stats]) => ({
    name,
    totalIssues: stats.total,
    resolved: stats.resolved,
    pending: stats.pending,
  }));

  const projectMap = new Map<string, { dept: string; total: number; resolved: number; pending: number }>();
  folders.forEach((folder) => {
    const key = folder.project;
    const base = computeBaseIssues(folder.id);
    const deptName = folder.department;
    const deptStat = deptStatsComputed[deptName] || {
      total: base.total,
      resolved: Math.floor(base.total * 0.5),
      pending: Math.ceil(base.total * 0.5),
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
      });
    }
  });

  const projectStats: ProjectStat[] = Array.from(projectMap.entries()).map(([name, stats]) => ({
    name,
    department: stats.dept,
    totalIssues: stats.total,
    resolved: stats.resolved,
    pending: stats.pending,
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
      totalIssues: base.total,
      resolved,
      pending: base.total - resolved,
    };
  });

  const totalIssues = departmentStats.reduce((sum, d) => sum + d.totalIssues, 0);
  const resolved = departmentStats.reduce((sum, d) => sum + d.resolved, 0);
  const pending = departmentStats.reduce((sum, d) => sum + d.pending, 0);

  return {
    period,
    totalIssues,
    resolved,
    pending,
    completionRate: totalIssues > 0 ? Math.round((resolved / totalIssues) * 100) : 0,
    departmentStats,
    projectStats,
    folderStats,
  };
}
