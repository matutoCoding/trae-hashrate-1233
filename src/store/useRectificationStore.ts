import { create } from 'zustand';
import type { Rectification, RectificationStatus, DepartmentStat, ProjectStat, FolderStat } from '@/types';
import { rectifications as initialRectifications } from '@/data/rectifications';
import {
  loadRectifications,
  saveRectifications,
  saveScreenshot as saveScreenshotUtil,
} from '@/utils/storage';
import { folders } from '@/data/folders';

function computeDueDate(createdAtStr: string): string {
  try {
    const parts = createdAtStr.split(/[\/\s年日月]/g).filter(Boolean);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return '';
  }
}

function isOverdue(rect: Rectification): boolean {
  if (rect.status === 'completed' || rect.status === 'cancelled') return false;
  try {
    const now = new Date();
    const dueParts = rect.dueDate.split(/[\/\s年日月]/g).filter(Boolean);
    if (dueParts.length >= 3) {
      const year = parseInt(dueParts[0], 10);
      const month = parseInt(dueParts[1], 10) - 1;
      const day = parseInt(dueParts[2], 10);
      const due = new Date(year, month, day);
      return now > due;
    }
    return false;
  } catch {
    return false;
  }
}

function computeStatsFromRectifications(rects: Rectification[]) {
  const total = rects.length;
  const resolved = rects.filter((r) => r.status === 'completed').length;
  const pending = rects.filter((r) => r.status === 'pending').length;
  const processing = rects.filter((r) => r.status === 'processing').length;
  const overdue = rects.filter((r) => r.isOverdue).length;
  const ids = rects.map((r) => r.id);
  return { total, resolved, pending, processing, overdue, ids };
}

interface RectificationState {
  rectifications: Rectification[];
  statusFilter: RectificationStatus | 'all';
  ownerFilter: string;
  departmentFilter: string;
  overdueFilter: 'all' | 'overdue' | 'not_overdue';
  initialized: boolean;
  initialize: () => void;
  refreshOverdue: () => void;
  getRectificationsByFolderId: (folderId: string) => Rectification[];
  getRectificationsByDepartment: (department: string) => Rectification[];
  getRectificationsByProject: (department: string, project: string) => Rectification[];
  getRectificationById: (id: string) => Rectification | undefined;
  setStatusFilter: (status: RectificationStatus | 'all') => void;
  setOwnerFilter: (owner: string) => void;
  setDepartmentFilter: (dept: string) => void;
  setOverdueFilter: (filter: 'all' | 'overdue' | 'not_overdue') => void;
  getFilteredRectifications: () => Rectification[];
  getOwnerList: () => { id: string; name: string; count: number }[];
  getDepartmentList: () => { name: string; count: number }[];
  addRectification: (rect: Omit<Rectification, 'id' | 'createdAt' | 'status' | 'dueDate' | 'isOverdue'>) => void;
  updateRectificationStatus: (
    id: string,
    status: RectificationStatus,
    result?: string,
    screenshot?: string,
    screenshotData?: string
  ) => void;
  batchAddRectifications: (
    rects: Omit<Rectification, 'id' | 'createdAt' | 'status' | 'dueDate' | 'isOverdue'>[]
  ) => void;
  computeDepartmentStats: () => Record<string, { total: number; resolved: number; pending: number; processing: number; overdue: number }>;
  computeFullDepartmentStats: () => DepartmentStat[];
  computeFullProjectStats: (department?: string) => ProjectStat[];
  computeFullFolderStats: (department?: string, project?: string) => FolderStat[];
  computeCompletionRate: () => number;
  getOverviewStats: () => { total: number; resolved: number; pending: number; processing: number; overdue: number; rate: number };
  getRectificationsForDrill: (
    level: 'department' | 'project' | 'folder',
    department?: string,
    project?: string,
    folderId?: string
  ) => Rectification[];
}

export const useRectificationStore = create<RectificationState>((set, get) => ({
  rectifications: initialRectifications,
  statusFilter: 'all',
  ownerFilter: '',
  departmentFilter: '',
  overdueFilter: 'all',
  initialized: false,

  initialize: () => {
    if (get().initialized) {
      get().refreshOverdue();
      return;
    }
    const stored = loadRectifications();
    let data: Rectification[] = [];
    if (stored && stored.length > 0) {
      data = stored;
    } else {
      data = initialRectifications.map((r) => ({
        ...r,
        dueDate: r.dueDate || computeDueDate(r.createdAt),
      }));
      saveRectifications(data);
    }
    const withOverdue = data.map((r) => ({ ...r, isOverdue: isOverdue(r) }));
    set({ rectifications: withOverdue, initialized: true });
    saveRectifications(withOverdue);
  },

  refreshOverdue: () => {
    const next = get().rectifications.map((r) => ({ ...r, isOverdue: isOverdue(r) }));
    set({ rectifications: next });
    saveRectifications(next);
  },

  getRectificationsByFolderId: (folderId) => get().rectifications.filter((r) => r.folderId === folderId),

  getRectificationsByDepartment: (department) => {
    const folderIds = folders.filter((f) => f.department === department).map((f) => f.id);
    return get().rectifications.filter((r) => folderIds.includes(r.folderId));
  },

  getRectificationsByProject: (department, project) => {
    const folderIds = folders
      .filter((f) => f.department === department && f.project === project)
      .map((f) => f.id);
    return get().rectifications.filter((r) => folderIds.includes(r.folderId));
  },

  getRectificationById: (id) => get().rectifications.find((r) => r.id === id),

  setStatusFilter: (status) => set({ statusFilter: status }),
  setOwnerFilter: (owner) => set({ ownerFilter: owner }),
  setDepartmentFilter: (dept) => set({ departmentFilter: dept }),
  setOverdueFilter: (filter) => set({ overdueFilter: filter }),

  getFilteredRectifications: () => {
    const { rectifications, statusFilter, ownerFilter, departmentFilter, overdueFilter } = get();
    let list = rectifications;
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (ownerFilter) list = list.filter((r) => r.ownerName === ownerFilter);
    if (departmentFilter) {
      const folderIds = folders.filter((f) => f.department === departmentFilter).map((f) => f.id);
      list = list.filter((r) => folderIds.includes(r.folderId));
    }
    if (overdueFilter === 'overdue') list = list.filter((r) => r.isOverdue);
    if (overdueFilter === 'not_overdue') list = list.filter((r) => !r.isOverdue);
    return [...list].sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      const order = { pending: 0, processing: 1, cancelled: 2, completed: 3 } as const;
      return order[a.status] - order[b.status];
    });
  },

  getOwnerList: () => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    get().rectifications.forEach((r) => {
      if (!map.has(r.ownerId)) {
        map.set(r.ownerId, { id: r.ownerId, name: r.ownerName, count: 0 });
      }
      const entry = map.get(r.ownerId)!;
      if (r.status !== 'completed' && r.status !== 'cancelled') {
        entry.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  },

  getDepartmentList: () => {
    const map = new Map<string, number>();
    get().rectifications.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
      const key = folder.department;
      let current = map.get(key) || 0;
      if (r.status !== 'completed' && r.status !== 'cancelled') {
        current++;
      }
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  },

  addRectification: (rect) => {
    const createdAt = new Date().toLocaleString('zh-CN');
    const dueDate = computeDueDate(createdAt);
    const newRect: Rectification = {
      ...rect,
      id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      createdAt,
      dueDate,
      status: 'pending' as RectificationStatus,
      isOverdue: false,
    };
    const next = [newRect, ...get().rectifications];
    set({ rectifications: next });
    saveRectifications(next);
  },

  batchAddRectifications: (rects) => {
    const now = Date.now();
    const createdAt = new Date().toLocaleString('zh-CN');
    const dueDate = computeDueDate(createdAt);
    const newRects = rects.map((rect, idx) => ({
      ...rect,
      id: `r${now}${idx}${Math.random().toString(36).slice(2, 4)}`,
      createdAt,
      dueDate,
      status: 'pending' as RectificationStatus,
      isOverdue: false,
    }));
    const next = [...newRects, ...get().rectifications];
    set({ rectifications: next });
    saveRectifications(next);
  },

  updateRectificationStatus: (id, status, result, screenshot, screenshotData) => {
    if (screenshot && screenshotData) {
      saveScreenshotUtil(screenshot, screenshotData);
    }
    const next = get().rectifications.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            result: result ?? r.result,
            screenshot: screenshot ?? r.screenshot,
            completedAt: status === 'completed' ? new Date().toLocaleString('zh-CN') : r.completedAt,
            isOverdue: false,
          }
        : r
    );
    set({ rectifications: next });
    saveRectifications(next);
  },

  computeDepartmentStats: () => {
    const stats: Record<
      string,
      { total: number; resolved: number; pending: number; processing: number; overdue: number }
    > = {};
    folders.forEach((folder) => {
      if (!stats[folder.department]) {
        stats[folder.department] = { total: 0, resolved: 0, pending: 0, processing: 0, overdue: 0 };
      }
    });
    get().rectifications.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
      const dept = folder.department;
      const s = stats[dept];
      if (!s) return;
      s.total++;
      if (r.status === 'completed') s.resolved++;
      else if (r.status === 'pending') s.pending++;
      else if (r.status === 'processing') s.processing++;
      if (r.isOverdue) s.overdue++;
    });
    return stats;
  },

  computeFullDepartmentStats: () => {
    const stats: DepartmentStat[] = [];
    const raw = get().computeDepartmentStats();
    Object.entries(raw).forEach(([name, s]) => {
      const rects = get().getRectificationsByDepartment(name);
      stats.push({
        name,
        totalIssues: s.total,
        resolved: s.resolved,
        pending: s.pending,
        processing: s.processing,
        overdue: s.overdue,
        rectificationIds: rects.map((r) => r.id),
      });
    });
    return stats;
  },

  computeFullProjectStats: (department?) => {
    const stats: ProjectStat[] = [];
    const projectMap = new Map<string, ProjectStat>();
    const relevantRects = department ? get().getRectificationsByDepartment(department) : get().rectifications;
    relevantRects.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
      if (department && folder.department !== department) return;
      const key = `${folder.department}||${folder.project}`;
      if (!projectMap.has(key)) {
        projectMap.set(key, {
          name: folder.project,
          department: folder.department,
          totalIssues: 0,
          resolved: 0,
          pending: 0,
          processing: 0,
          overdue: 0,
          rectificationIds: [],
        });
      }
      const stat = projectMap.get(key)!;
      stat.totalIssues++;
      stat.rectificationIds.push(r.id);
      if (r.status === 'completed') stat.resolved++;
      else if (r.status === 'pending') stat.pending++;
      else if (r.status === 'processing') stat.processing++;
      if (r.isOverdue) stat.overdue++;
    });
    return Array.from(projectMap.values());
  },

  computeFullFolderStats: (department?, project?) => {
    const stats: FolderStat[] = [];
    const relevantRects =
      department && project
        ? get().getRectificationsByProject(department, project)
        : department
        ? get().getRectificationsByDepartment(department)
        : get().rectifications;
    const folderMap = new Map<string, FolderStat>();
    relevantRects.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
      if (department && folder.department !== department) return;
      if (project && folder.project !== project) return;
      const key = folder.id;
      if (!folderMap.has(key)) {
        folderMap.set(key, {
          name: folder.name,
          department: folder.department,
          project: folder.project,
          folderId: folder.id,
          totalIssues: 0,
          resolved: 0,
          pending: 0,
          processing: 0,
          overdue: 0,
          rectificationIds: [],
        });
      }
      const stat = folderMap.get(key)!;
      stat.totalIssues++;
      stat.rectificationIds.push(r.id);
      if (r.status === 'completed') stat.resolved++;
      else if (r.status === 'pending') stat.pending++;
      else if (r.status === 'processing') stat.processing++;
      if (r.isOverdue) stat.overdue++;
    });
    return Array.from(folderMap.values());
  },

  computeCompletionRate: () => {
    const { total, resolved } = get().getOverviewStats();
    return total > 0 ? Math.round((resolved / total) * 100) : 0;
  },

  getOverviewStats: () => {
    const { rectifications } = get();
    const total = rectifications.length;
    const resolved = rectifications.filter((r) => r.status === 'completed').length;
    const pending = rectifications.filter((r) => r.status === 'pending').length;
    const processing = rectifications.filter((r) => r.status === 'processing').length;
    const overdue = rectifications.filter((r) => r.isOverdue).length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, pending, processing, overdue, rate };
  },

  getRectificationsForDrill: (level, department?, project?, folderId?) => {
    if (level === 'department' && department) {
      return get().getRectificationsByDepartment(department);
    }
    if (level === 'project' && department && project) {
      return get().getRectificationsByProject(department, project);
    }
    if (level === 'folder' && folderId) {
      return get().getRectificationsByFolderId(folderId);
    }
    return [];
  },
}));
