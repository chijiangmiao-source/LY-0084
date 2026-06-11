export type HandoverStatus =
  | 'pending'
  | 'recovering'
  | 'backing_up'
  | 'backed_up'
  | 'handed_over'
  | 'completed'
  | 'anomaly';

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  pending: '待交接',
  recovering: '回收中',
  backing_up: '备份中',
  backed_up: '备份完成',
  handed_over: '已交接',
  completed: '已完成',
  anomaly: '异常',
};

export const HANDOVER_STATUS_COLORS: Record<HandoverStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  recovering: 'bg-blue-100 text-blue-600',
  backing_up: 'bg-yellow-100 text-yellow-700',
  backed_up: 'bg-green-100 text-green-600',
  handed_over: 'bg-champagne-100 text-champagne-700',
  completed: 'bg-forest-100 text-forest-600',
  anomaly: 'bg-wine-100 text-wine-600',
};

export interface WeddingProject {
  id: string;
  projectNumber: string;
  coupleName: string;
  weddingDate: string;
  photographer: string;
  videographer: string;
  cardCount: number;
  recoveredCount: number;
  backupCount: number;
  handoverStatus: HandoverStatus;
  anomalyNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageCard {
  id: string;
  projectId: string;
  cardLabel: string;
  capacity: string;
  isRecovered: boolean;
  recoveredAt: string | null;
}

export interface BackupRecord {
  id: string;
  projectId: string;
  location: string;
  isCompleted: boolean;
  completedAt: string | null;
}

export type MissingSeverity = 'low' | 'medium' | 'high';

export const MISSING_SEVERITY_LABELS: Record<MissingSeverity, string> = {
  low: '轻微',
  medium: '中等',
  high: '严重',
};

export interface MissingItem {
  id: string;
  projectId: string;
  description: string;
  severity: MissingSeverity;
  isResolved: boolean;
  resolution: string;
  createdAt: string;
}

export interface StatusLog {
  id: string;
  projectId: string;
  fromStatus: HandoverStatus | null;
  toStatus: HandoverStatus;
  timestamp: string;
  remark: string;
}

export interface ProjectFormData {
  projectNumber: string;
  coupleName: string;
  weddingDate: string;
  photographer: string;
  videographer: string;
  cardCount: number;
  handoverStatus: HandoverStatus;
  anomalyNote: string;
}

export interface ProjectStatistics {
  total: number;
  pending: number;
  backingUp: number;
  completed: number;
  anomaly: number;
}
