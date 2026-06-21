import { create } from 'zustand';
import type { AuditReport, DepartmentStat, ProjectStat, FolderStat, ReportDimension } from '@/types';
import { folders } from '@/data/folders';

interface ReportState {
  period: string;
  dimension: ReportDimension;
  getReport: () => AuditReport;
  setPeriod: (period: string) => void;
  setDimension: (dimension: ReportDimension) => void;
}

const generateDepartmentStats = (): DepartmentStat[] => {
  const deptMap = new Map<string, { total: number; resolved: number; pending: number }>();

  folders.forEach((folder) => {
    const dept = folder.department;
    const issues = folder.riskTypes.length * 3;
    const resolved = Math.floor(issues * 0.6);
    const pending = issues - resolved;

    if (deptMap.has(dept)) {
      const current = deptMap.get(dept)!;
      current.total += issues;
      current.resolved += resolved;
      current.pending += pending;
    } else {
      deptMap.set(dept, { total: issues, resolved, pending });
    }
  });

  return Array.from(deptMap.entries()).map(([name, stats]) => ({
    name,
    totalIssues: stats.total,
    resolved: stats.resolved,
    pending: stats.pending,
  }));
};

const generateProjectStats = (): ProjectStat[] => {
  const projectMap = new Map<string, { dept: string; total: number; resolved: number; pending: number }>();

  folders.forEach((folder) => {
    const key = folder.project;
    const issues = folder.riskTypes.length * 2;
    const resolved = Math.floor(issues * 0.5);
    const pending = issues - resolved;

    if (projectMap.has(key)) {
      const current = projectMap.get(key)!;
      current.total += issues;
      current.resolved += resolved;
      current.pending += pending;
    } else {
      projectMap.set(key, { dept: folder.department, total: issues, resolved, pending });
    }
  });

  return Array.from(projectMap.entries()).map(([name, stats]) => ({
    name,
    department: stats.dept,
    totalIssues: stats.total,
    resolved: stats.resolved,
    pending: stats.pending,
  }));
};

const generateFolderStats = (): FolderStat[] => {
  return folders.map((folder) => {
    const issues = folder.riskTypes.length * 2;
    const resolved = Math.floor(issues * 0.4);
    return {
      name: folder.name,
      department: folder.department,
      project: folder.project,
      totalIssues: issues,
      resolved,
      pending: issues - resolved,
    };
  });
};

export const useReportStore = create<ReportState>((set, get) => ({
  period: '2025年6月',
  dimension: 'department',

  setPeriod: (period) => set({ period }),

  setDimension: (dimension) => set({ dimension }),

  getReport: () => {
    const departmentStats = generateDepartmentStats();
    const projectStats = generateProjectStats();
    const folderStats = generateFolderStats();

    const totalIssues = departmentStats.reduce((sum, d) => sum + d.totalIssues, 0);
    const resolved = departmentStats.reduce((sum, d) => sum + d.resolved, 0);
    const pending = departmentStats.reduce((sum, d) => sum + d.pending, 0);

    return {
      period: get().period,
      totalIssues,
      resolved,
      pending,
      completionRate: totalIssues > 0 ? Math.round((resolved / totalIssues) * 100) : 0,
      departmentStats,
      projectStats,
      folderStats,
    };
  },
}));
