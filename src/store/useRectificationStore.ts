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

function parsePeriod(periodStr: string): { start: Date; end: Date } | null {
  try {
    if (periodStr.includes('Q')) {
      const match = periodStr.match(/(\d+)年Q(\d)/);
      if (!match) return null;
      const year = parseInt(match[1], 10);
      const quarter = parseInt(match[2], 10);
      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 3;
      return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, endMonth, 0, 23, 59, 59, 999),
      };
    } else {
      const match = periodStr.match(/(\d+)年(\d+)月/);
      if (!match) return null;
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month, lastDay, 23, 59, 59, 999),
      };
    }
  } catch {
    return null;
  }
}

function parseCreatedAt(createdAtStr: string): Date | null {
  try {
    const parts = createdAtStr.split(/[\/\s年日月]/g).filter(Boolean);
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  } catch {
    return null;
  }
}

function isRectInPeriod(rect: Rectification, period: string): boolean {
  const range = parsePeriod(period);
  if (!range) return true;
  const created = parseCreatedAt(rect.createdAt);
  if (!created) return true;
  return created >= range.start && created <= range.end;
}

interface ScopeFilter {
  period?: string;
  department?: string;
  project?: string;
  folderId?: string;
}

function filterByScope(rects: Rectification[], filter: ScopeFilter): Rectification[] {
  let result = [...rects];

  if (filter.period) {
    result = result.filter((r) => isRectInPeriod(r, filter.period!));
  }
  if (filter.department) {
    const folderIds = folders.filter((f) => f.department === filter.department).map((f) => f.id);
    result = result.filter((r) => folderIds.includes(r.folderId));
  }
  if (filter.project) {
    const folderIds = folders.filter((f) => f.project === filter.project).map((f) => f.id);
    result = result.filter((r) => folderIds.includes(r.folderId));
  }
  if (filter.folderId) {
    result = result.filter((r) => r.folderId === filter.folderId);
  }

  return result;
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
  computeDepartmentStats: (filter?: ScopeFilter) => Record<string, { total: number; resolved: number; pending: number; processing: number; overdue: number }>;
  computeFullDepartmentStats: (filter?: ScopeFilter) => DepartmentStat[];
  computeFullProjectStats: (filter?: ScopeFilter) => ProjectStat[];
  computeFullFolderStats: (filter?: ScopeFilter) => FolderStat[];
  computeCompletionRate: (filter?: ScopeFilter) => number;
  getOverviewStats: (filter?: ScopeFilter) => { total: number; resolved: number; pending: number; processing: number; overdue: number; rate: number };
  getRectificationsForDrill: (
    level: 'department' | 'project' | 'folder',
    department?: string,
    project?: string,
    folderId?: string,
    period?: string
  ) => Rectification[];
  getFilteredByScope: (filter: ScopeFilter) => Rectification[];
}

function isRectDataValid(rects: Rectification[]): boolean {
  if (!rects || rects.length === 0) return false;
  for (const r of rects) {
    if (!r.createdAt || typeof r.createdAt !== 'string') return false;
    const parsed = parseCreatedAt(r.createdAt);
    if (!parsed) return false;
  }
  return true;
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
      const currentRects = get().rectifications;
      if (!isRectDataValid(currentRects)) {
        const data = initialRectifications.map((r) => ({
          ...r,
          dueDate: r.dueDate || computeDueDate(r.createdAt),
        }));
        const withOverdue = data.map((r) => ({ ...r, isOverdue: isOverdue(r) }));
        set({ rectifications: withOverdue, initialized: true });
        saveRectifications(withOverdue);
      } else {
        get().refreshOverdue();
      }
      return;
    }
    const stored = loadRectifications();
    let data: Rectification[] = [];
    if (isRectDataValid(stored)) {
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
    let list = [...rectifications];
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (ownerFilter) {
      list = list.filter((r) => r.ownerName === ownerFilter);
    }
    if (departmentFilter) {
      const folderIds = folders.filter((f) => f.department === departmentFilter).map((f) => f.id);
      list = list.filter((r) => folderIds.includes(r.folderId));
    }
    if (overdueFilter === 'overdue') {
      list = list.filter((r) => r.isOverdue);
    } else if (overdueFilter === 'not_overdue') {
      list = list.filter((r) => !r.isOverdue);
    }
    return list;
  },

  getOwnerList: () => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    get().rectifications.forEach((r) => {
      if (!map.has(r.ownerId)) {
        map.set(r.ownerId, { id: r.ownerId, name: r.ownerName, count: 0 });
      }
      map.get(r.ownerId)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  },

  getDepartmentList: () => {
    const map = new Map<string, { name: string; count: number }>();
    get().rectifications.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
      if (!map.has(folder.department)) {
        map.set(folder.department, { name: folder.department, count: 0 });
      }
      map.get(folder.department)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  },

  addRectification: (rect) => {
    const now = new Date();
    const createdAt = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dueDate = computeDueDate(createdAt);
    const newRect: Rectification = {
      ...rect,
      id: `rect-${Date.now()}`,
      createdAt,
      status: 'pending',
      dueDate,
      isOverdue: false,
    };
    const next = [...get().rectifications, newRect];
    set({ rectifications: next });
    saveRectifications(next);
  },

  updateRectificationStatus: (id, status, result, screenshot, screenshotData) => {
    const now = new Date();
    const completedAt = status === 'completed'
      ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      : undefined;
    if (screenshot && screenshotData) {
      saveScreenshotUtil(screenshot, screenshotData);
    }
    const next = get().rectifications.map((r) => {
      if (r.id === id) {
        return { ...r, status, result, screenshot, completedAt, isOverdue: status === 'completed' || status === 'cancelled' ? false : r.isOverdue };
      }
      return r;
    });
    set({ rectifications: next });
    saveRectifications(next);
  },

  batchAddRectifications: (rects) => {
    const now = new Date();
    const createdAt = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dueDate = computeDueDate(createdAt);
    const newRects = rects.map((r, idx) => ({
      ...r,
      id: `rect-${Date.now()}-${idx}`,
      createdAt,
      status: 'pending',
      dueDate,
      isOverdue: false,
    } as Rectification));
    const next = [...get().rectifications, ...newRects];
    set({ rectifications: next });
    saveRectifications(next);
  },

  getFilteredByScope: (filter) => filterByScope(get().rectifications, filter),

  computeDepartmentStats: (filter = {}) => {
    const relevantRects = filterByScope(get().rectifications, filter);
    const stats: Record<string, { total: number; resolved: number; pending: number; processing: number; overdue: number }> = {};
    relevantRects.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
      const dept = folder.department;
      if (!stats[dept]) {
        stats[dept] = { total: 0, resolved: 0, pending: 0, processing: 0, overdue: 0 };
      }
      stats[dept].total++;
      if (r.status === 'completed') stats[dept].resolved++;
      else if (r.status === 'pending') stats[dept].pending++;
      else if (r.status === 'processing') stats[dept].processing++;
      if (r.isOverdue) stats[dept].overdue++;
    });
    return stats;
  },

  computeFullDepartmentStats: (filter = {}) => {
    const stats: DepartmentStat[] = [];
    const raw = get().computeDepartmentStats(filter);
    Object.entries(raw).forEach(([name, s]) => {
      const rects = filterByScope(get().rectifications, { ...filter, department: name });
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
    return stats.sort((a, b) => b.totalIssues - a.totalIssues);
  },

  computeFullProjectStats: (filter = {}) => {
    const relevantRects = filterByScope(get().rectifications, filter);
    const projectMap = new Map<string, ProjectStat>();
    relevantRects.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
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
    return Array.from(projectMap.values()).sort((a, b) => b.totalIssues - a.totalIssues);
  },

  computeFullFolderStats: (filter = {}) => {
    const relevantRects = filterByScope(get().rectifications, filter);
    const folderMap = new Map<string, FolderStat>();
    relevantRects.forEach((r) => {
      const folder = folders.find((f) => f.id === r.folderId);
      if (!folder) return;
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
    return Array.from(folderMap.values()).sort((a, b) => b.totalIssues - a.totalIssues);
  },

  computeCompletionRate: (filter = {}) => {
    const { total, resolved } = get().getOverviewStats(filter);
    return total > 0 ? Math.round((resolved / total) * 100) : 0;
  },

  getOverviewStats: (filter = {}) => {
    const relevantRects = filterByScope(get().rectifications, filter);
    const total = relevantRects.length;
    const resolved = relevantRects.filter((r) => r.status === 'completed').length;
    const pending = relevantRects.filter((r) => r.status === 'pending').length;
    const processing = relevantRects.filter((r) => r.status === 'processing').length;
    const overdue = relevantRects.filter((r) => r.isOverdue).length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, pending, processing, overdue, rate };
  },

  getRectificationsForDrill: (level, department, project, folderId, period) => {
    const filter: ScopeFilter = { period };
    if (level === 'department' && department) {
      filter.department = department;
    }
    if (level === 'project' && department && project) {
      filter.department = department;
      filter.project = project;
    }
    if (level === 'folder' && folderId) {
      filter.folderId = folderId;
    }
    return filterByScope(get().rectifications, filter);
  },
}));
