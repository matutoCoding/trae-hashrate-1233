import { create } from 'zustand';
import type { Folder, Member, RiskType, RiskLevel } from '@/types';
import { folders } from '@/data/folders';
import { membersByFolder } from '@/data/members';

interface FolderState {
  folders: Folder[];
  selectedRiskTypes: RiskType[];
  selectedDepartment: string;
  searchKeyword: string;
  sortBy: 'riskLevel' | 'memberCount' | 'lastAccessed';
  getFolderById: (id: string) => Folder | undefined;
  getMembersByFolderId: (folderId: string) => Member[];
  setSelectedRiskTypes: (types: RiskType[]) => void;
  setSelectedDepartment: (dept: string) => void;
  setSearchKeyword: (keyword: string) => void;
  setSortBy: (sort: 'riskLevel' | 'memberCount' | 'lastAccessed') => void;
  getFilteredFolders: () => Folder[];
}

const riskLevelOrder: Record<RiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const useFolderStore = create<FolderState>((set, get) => ({
  folders,
  selectedRiskTypes: [],
  selectedDepartment: '',
  searchKeyword: '',
  sortBy: 'riskLevel',

  getFolderById: (id) => get().folders.find((f) => f.id === id),

  getMembersByFolderId: (folderId) => membersByFolder[folderId] || [],

  setSelectedRiskTypes: (types) => set({ selectedRiskTypes: types }),

  setSelectedDepartment: (dept) => set({ selectedDepartment: dept }),

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  setSortBy: (sort) => set({ sortBy: sort }),

  getFilteredFolders: () => {
    const { folders, selectedRiskTypes, selectedDepartment, searchKeyword, sortBy } = get();
    let result = [...folders];

    if (selectedRiskTypes.length > 0) {
      result = result.filter((f) =>
        selectedRiskTypes.some((type) => f.riskTypes.includes(type))
      );
    }

    if (selectedDepartment) {
      result = result.filter((f) => f.department === selectedDepartment);
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(keyword) ||
          f.path.toLowerCase().includes(keyword) ||
          f.ownerName.toLowerCase().includes(keyword)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'riskLevel') {
        return riskLevelOrder[b.riskLevel] - riskLevelOrder[a.riskLevel];
      }
      if (sortBy === 'memberCount') {
        return b.memberCount - a.memberCount;
      }
      return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
    });

    return result;
  },
}));
