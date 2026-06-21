import { create } from 'zustand';
import type { Rectification, RectificationStatus } from '@/types';
import { rectifications } from '@/data/rectifications';

interface RectificationState {
  rectifications: Rectification[];
  statusFilter: RectificationStatus | 'all';
  getRectificationsByFolderId: (folderId: string) => Rectification[];
  getRectificationById: (id: string) => Rectification | undefined;
  setStatusFilter: (status: RectificationStatus | 'all') => void;
  getFilteredRectifications: () => Rectification[];
  addRectification: (rect: Omit<Rectification, 'id' | 'createdAt' | 'status'>) => void;
  updateRectificationStatus: (id: string, status: RectificationStatus, result?: string, screenshot?: string) => void;
}

export const useRectificationStore = create<RectificationState>((set, get) => ({
  rectifications,
  statusFilter: 'all',

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
      id: `r${Date.now()}`,
      createdAt: new Date().toLocaleString('zh-CN'),
      status: 'pending',
    };
    set((state) => ({
      rectifications: [newRect, ...state.rectifications],
    }));
  },

  updateRectificationStatus: (id, status, result, screenshot) => {
    set((state) => ({
      rectifications: state.rectifications.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              result: result || r.result,
              screenshot: screenshot || r.screenshot,
              completedAt: status === 'completed' ? new Date().toLocaleString('zh-CN') : r.completedAt,
            }
          : r
      ),
    }));
  },
}));
