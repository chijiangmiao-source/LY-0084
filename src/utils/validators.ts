import type { HandoverStatus, WeddingProject } from '~/types/project';
import { isFutureDate } from './dateUtils';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateProjectForm(
  data: {
    projectNumber: string;
    coupleName: string;
    weddingDate: string;
    photographer: string;
    videographer: string;
    cardCount: number;
    handoverStatus: HandoverStatus;
    anomalyNote: string;
  },
  options: {
    isEdit?: boolean;
    currentId?: string;
    isNumberExists: (num: string, excludeId?: string) => boolean;
  }
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.projectNumber.trim()) {
    errors.projectNumber = '项目编号不能为空';
  } else if (options.isNumberExists(data.projectNumber, options.currentId)) {
    errors.projectNumber = '项目编号已存在，不能重复';
  }

  if (!data.coupleName.trim()) {
    errors.coupleName = '新人姓名不能为空';
  }

  if (!data.weddingDate) {
    errors.weddingDate = '婚礼日期不能为空';
  } else if (isFutureDate(data.weddingDate)) {
    errors.weddingDate = '婚礼日期不能晚于当前日期';
  }

  if (!data.photographer.trim()) {
  }

  if (!data.videographer.trim()) {
  }

  if (data.cardCount < 0) {
    errors.cardCount = '存储卡数量不能为负数';
  }

  if (data.handoverStatus === 'anomaly') {
    if (!data.anomalyNote.trim()) {
      errors.anomalyNote = '状态为异常时，异常说明必须填写';
    } else if (data.anomalyNote.trim().length < 8) {
      errors.anomalyNote = '异常说明不少于8个字';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateHandoverStatusChange(
  project: WeddingProject,
  newStatus: HandoverStatus
): ValidationResult {
  const errors: Record<string, string> = {};

  if (newStatus === 'handed_over' || newStatus === 'completed') {
    if (project.cardCount !== project.recoveredCount) {
    errors.handoverStatus = '存储卡数量与回收数量不一致，不能标记为已交接';
  }
  }

  if (newStatus === 'handed_over') {
    const hasBackup = project.backupCount > 0;
    if (!hasBackup) {
      errors.handoverStatus = '未完成首次备份前不能进入待剪辑状态';
    }
  }

  if (newStatus === 'anomaly' && !project.anomalyNote?.trim()) {
    errors.anomalyNote = '状态为异常时，异常说明必须填写';
  } else if (newStatus === 'anomaly' && project.anomalyNote.trim().length < 8) {
    errors.anomalyNote = '异常说明不少于8个字';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateBackupCount(
  cardCount: number,
  backupCount: number
): ValidationResult {
  const errors: Record<string, string> = {};

  if (backupCount < 0) {
    errors.backupCount = '已备份数量不能为负数';
  }
  if (backupCount > cardCount) {
    errors.backupCount = '已备份数量不能超过存储卡数量';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRecoveredCount(
  cardCount: number,
  recoveredCount: number
): ValidationResult {
  const errors: Record<string, string> = {};

  if (recoveredCount < 0) {
    errors.recoveredCount = '回收数量不能为负数';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
