export type RiskType = 'external_access' | 'resigned_access' | 'too_many_editors' | 'long_unaccessed';

export type RiskLevel = 'high' | 'medium' | 'low';

export type MemberRole = 'owner' | 'editor' | 'viewer' | 'commenter';

export type RectificationStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Folder {
  id: string;
  name: string;
  path: string;
  department: string;
  project: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  size: number;
  memberCount: number;
  riskTypes: RiskType[];
  riskLevel: RiskLevel;
  lastAccessed: string;
}

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  department: string;
  role: MemberRole;
  accessSource: string;
  lastAccess: string;
  isExternal: boolean;
  isResigned: boolean;
  status: 'active' | 'inactive';
}

export interface Rectification {
  id: string;
  folderId: string;
  folderName: string;
  auditorId: string;
  auditorName: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  memberNames: string[];
  actionType: string;
  opinion: string;
  status: RectificationStatus;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  result?: string;
  screenshot?: string;
  isOverdue?: boolean;
}

export interface DepartmentStat {
  name: string;
  totalIssues: number;
  resolved: number;
  pending: number;
  processing: number;
  overdue: number;
  rectificationIds: string[];
}

export interface ProjectStat {
  name: string;
  department: string;
  totalIssues: number;
  resolved: number;
  pending: number;
  processing: number;
  overdue: number;
  rectificationIds: string[];
}

export interface FolderStat {
  name: string;
  department: string;
  project: string;
  totalIssues: number;
  resolved: number;
  pending: number;
  processing: number;
  overdue: number;
  rectificationIds: string[];
  folderId?: string;
}

export interface AuditReport {
  period: string;
  totalIssues: number;
  resolved: number;
  pending: number;
  processing: number;
  overdue: number;
  completionRate: number;
  departmentStats: DepartmentStat[];
  projectStats: ProjectStat[];
  folderStats: FolderStat[];
}

export type ReportDimension = 'department' | 'project' | 'folder';

export type DrillLevel = 'overview' | 'department' | 'project' | 'folder' | 'rectifications';

export interface DrillState {
  level: DrillLevel;
  department?: string;
  project?: string;
  folderId?: string;
  folderName?: string;
}
