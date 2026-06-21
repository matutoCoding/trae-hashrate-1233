import { create } from 'zustand';
import type { Rectification, RectificationStatus } from '@/types';
import { rectifications as initialRectifications } from '@/data/rectifications';
import { loadRectifications, saveRectifications, saveScreenshot as saveScreenshotUtil } from '@/utils/storage';
import { folders } from '@/data/folders';
import { membersByFolder } from '@/data/members';

interface RectificationState {
  rectifications: Rectification[];
  statusFilter: RectificationStatus | 'all';
  initialized: boolean;
  initialize: () => void;
  getRectificationsByFolderId: (folderId: string) => Rectification[];
  getRectificationById: (id: string) => Rectification | undefined;
  setStatusFilter: (status: RectificationStatus | 'all') => void;
  getFilteredRectifications: () => Rectification[];
  addRectification: (rect: Omit<Rectification, 'id' | 'createdAt' | 'status'>) => void;
  updateRectificationStatus: (id: string, status: RectificationStatus, result?: string, screenshot?: string, screenshotData?: string) => void;
  batchAddRectifications: (rects: Omit<Rectification, 'id' | 'createdAt' | 'status'>[]) => void;
  computeFolderResolvedCount: (folderId: string) => number;
  computeFolderPendingCount: (folderId: string) => number;
  computeDepartmentStats: () => Record<string, { total: number; resolved: number; pending: number }>;
}

export const useRectificationStore = create<RectificationState>((set, get) => ({
  rectifications: initialRectifications,
  statusFilter: 'all',
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const stored = loadRectifications();
    if (stored && stored.length > 0) {
      set({ rectifications: stored, initialized: true });
    } else {
      set({ rectifications: initialRectifications, initialized: true });
      saveRectifications(initialRectifications);
    }
  },

  getRectificationsByFolderId: (folderId) =>
    get().rectifications.filter((r) => r.folderId === folderId),

  getRectificationById: (id) => get().rectifications.find((r) => r.id === id),

  setStatusFilter: (status) => set({ statusFilter: status }),

  getFilteredRectifications: () => {
    const { rectifications, statusFilter } = get();
    if (statusFilter === 'all') return rectifications;
    return rectifications.filter((r) => r.status === statusFilter);
  },

  addRectification: (rect) => {
    const newRect: Rectification = {
      ...rect,
      id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toLocaleString('zh-CN'),
      status: 'pending' as RectificationStatus,
    };
    const next = [newRect, ...get().rectifications];
    set({ rectifications: next });
    saveRectifications(next);
  },

  batchAddRectifications: (rects) => {
    const now = Date.now();
    const newRects = rects.map((rect, idx) => ({
      ...rect,
      id: `r${now}${idx}${Math.random().toString(36).slice(2, 4)}`,
      createdAt: new Date().toLocaleString('zh-CN'),
      status: 'pending' as RectificationStatus,
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
          }
        : r
    );
    set({ rectifications: next });
    saveRectifications(next);
  },

  computeFolderResolvedCount: (folderId) => {
    return get().rectifications
      .filter((r) => r.folderId === folderId && r.status === 'completed')
      .reduce((sum, r) => sum + r.memberIds.length, 0);
  },

  computeFolderPendingCount: (folderId) => {
    return get().rectifications
      .filter((r) => r.folderId === folderId && (r.status === 'pending' || r.status === 'processing'))
      .reduce((sum, r) => sum + r.memberIds.length, 0);
  },

  computeDepartmentStats: () => {
    const stats: Record<string, { total: number; resolved: number; pending: number }> = {};

    folders.forEach((folder) => {
      if (!stats[folder.department]) {
        stats[folder.department] = { total: 0, resolved: 0, pending: 0 };
      }
    });

    folders.forEach((folder) => {
      const members = membersByFolder[folder.id] || [];
      const riskyMembers = members.filter((m) => m.isExternal || m.isResigned).length;
      const baseIssues = folder.riskTypes.length * 2 + riskyMembers;
      stats[folder.department].total += baseIssues;

      const resolved = get().computeFolderResolvedCount(folder.id);
      const pending = get().computeFolderPendingCount(folder.id);
      stats[folder.department].resolved += Math.min(resolved, baseIssues);
      stats[folder.department].pending += Math.max(0, baseIssues - resolved + pending);
    });

    return stats;
  },
}));
