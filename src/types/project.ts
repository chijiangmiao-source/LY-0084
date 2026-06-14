export type HandoverStatus =
  | 'pending'
  | 'recovering'
  | 'backing_up'
  | 'backed_up'
  | 'handed_over'
  | 'editing'
  | 'completed'
  | 'anomaly';

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  pending: '待交接',
  recovering: '回收中',
  backing_up: '备份中',
  backed_up: '备份完成',
  handed_over: '已交接',
  editing: '待剪辑',
  completed: '已完成',
  anomaly: '异常',
};

export const HANDOVER_STATUS_COLORS: Record<HandoverStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  recovering: 'bg-blue-100 text-blue-600',
  backing_up: 'bg-yellow-100 text-yellow-700',
  backed_up: 'bg-green-100 text-green-600',
  handed_over: 'bg-champagne-100 text-champagne-700',
  editing: 'bg-purple-100 text-purple-700',
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
  handoverNote: string;
  createdAt: string;
  updatedAt: string;
}

export type DeviceType = 'camera' | 'drone' | 'action_cam' | 'audio' | 'other';

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  camera: '相机',
  drone: '无人机',
  action_cam: '运动相机',
  audio: '录音设备',
  other: '其他',
};

export const DEVICE_TYPE_ICONS: Record<DeviceType, string> = {
  camera: '📷',
  drone: '🚁',
  action_cam: '🎥',
  audio: '🎤',
  other: '💾',
};

export interface StorageCard {
  id: string;
  projectId: string;
  cardLabel: string;
  capacity: string;
  deviceType: DeviceType;
  deviceName: string;
  isRecovered: boolean;
  recoveredAt: string | null;
  fileCount?: number;
  totalSize?: string;
}

export interface BackupRecord {
  id: string;
  projectId: string;
  location: string;
  locationType: 'nas' | 'external_hdd' | 'cloud' | 'local' | 'other';
  isCompleted: boolean;
  completedAt: string | null;
  startedAt: string | null;
  fileCount?: number;
  totalSize?: string;
  verifyStatus?: 'pending' | 'verified' | 'failed';
  verifiedAt?: string | null;
}

export const BACKUP_LOCATION_TYPE_LABELS: Record<string, string> = {
  nas: 'NAS存储',
  external_hdd: '移动硬盘',
  cloud: '云端备份',
  local: '本地工作站',
  other: '其他',
};

export const BACKUP_LOCATION_TYPE_ICONS: Record<string, string> = {
  nas: '🖥️',
  external_hdd: '💽',
  cloud: '☁️',
  local: '💻',
  other: '📦',
};

export type ActivityType =
  | 'status_change'
  | 'card_add'
  | 'card_recover'
  | 'card_unrecover'
  | 'card_delete'
  | 'backup_add'
  | 'backup_complete'
  | 'backup_uncomplete'
  | 'backup_delete'
  | 'backup_verify'
  | 'missing_add'
  | 'missing_resolve'
  | 'missing_unresolve'
  | 'missing_delete'
  | 'handover_note_update'
  | 'project_edit';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  status_change: '状态变更',
  card_add: '添加存储卡',
  card_recover: '标记存储卡已回收',
  card_unrecover: '取消存储卡回收',
  card_delete: '删除存储卡',
  backup_add: '添加备份位置',
  backup_complete: '标记备份完成',
  backup_uncomplete: '取消备份完成',
  backup_delete: '删除备份位置',
  backup_verify: '备份验证',
  missing_add: '添加缺失记录',
  missing_resolve: '标记缺失已解决',
  missing_unresolve: '取消缺失解决',
  missing_delete: '删除缺失记录',
  handover_note_update: '更新交接备注',
  project_edit: '编辑项目信息',
};

export interface ActivityLog {
  id: string;
  projectId: string;
  type: ActivityType;
  description: string;
  details?: Record<string, unknown>;
  timestamp: string;
  operator?: string;
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
