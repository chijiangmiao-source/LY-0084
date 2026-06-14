import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { BackupRecord, WeddingProject } from '~/types/project';
import { BACKUP_LOCATION_TYPE_LABELS, BACKUP_LOCATION_TYPE_ICONS, HANDOVER_STATUS_LABELS } from '~/types/project';
import { backupStorage, projectStorage, logActivity } from '~/utils/storage';
import { formatDateTime } from '~/utils/dateUtils';
import { calculateAutoStatus } from '~/utils/statistics';

interface BackupStatusProps {
  projectId: string;
  project: WeddingProject;
  onUpdate$: () => void;
}

export const BackupStatus = component$<BackupStatusProps>(({ projectId, project, onUpdate$ }) => {
  const backups = useSignal<BackupRecord[]>([]);
  const newLocation = useSignal('');
  const newLocationType = useSignal<BackupRecord['locationType']>('other');
  const showAddForm = useSignal(false);
  const selectedType = useSignal<string>('all');
  const expandedBackupId = useSignal<string | null>(null);
  const editingBackupId = useSignal<string | null>(null);
  const editFileCount = useSignal('');
  const editTotalSize = useSignal('');
  const editLocation = useSignal('');

  useVisibleTask$(() => {
    backups.value = backupStorage.getByProjectId(projectId);
  });

  const addBackup = $(() => {
    if (!newLocation.value.trim()) return;

    const newBackup = backupStorage.create({
      projectId,
      location: newLocation.value.trim(),
      locationType: newLocationType.value,
      isCompleted: false,
      completedAt: null,
      startedAt: new Date().toISOString(),
    });

    logActivity(
      projectId,
      'backup_add',
      `添加备份位置 ${newBackup.location}（${BACKUP_LOCATION_TYPE_LABELS[newBackup.locationType]}）`,
      {
        backupId: newBackup.id,
        location: newBackup.location,
        locationType: newBackup.locationType,
      }
    );

    newLocation.value = '';
    showAddForm.value = false;
    const updatedBackups = backupStorage.getByProjectId(projectId);
    backups.value = updatedBackups;

    const completedCount = updatedBackups.filter((b) => b.isCompleted).length;
    const autoStatus = calculateAutoStatus(project, project.cardCount, project.recoveredCount, completedCount);
    
    const updates: Partial<WeddingProject> = {
      backupCount: completedCount,
    };

    if (autoStatus !== project.handoverStatus) {
      updates.handoverStatus = autoStatus;
      logActivity(
        projectId,
        'status_change',
        `状态从 ${HANDOVER_STATUS_LABELS[project.handoverStatus]} 变更为 ${HANDOVER_STATUS_LABELS[autoStatus]}`,
        {
          fromStatus: project.handoverStatus,
          toStatus: autoStatus,
          remark: '添加备份后自动更新状态',
        }
      );
    }

    projectStorage.update(projectId, updates);

    onUpdate$();
  });

  const toggleComplete = $((backupId: string, currentValue: boolean, location: string) => {
    backupStorage.update(backupId, {
      isCompleted: !currentValue,
      completedAt: !currentValue ? new Date().toISOString() : null,
      startedAt: !currentValue && !backups.value.find(b => b.id === backupId)?.startedAt
        ? new Date().toISOString()
        : backups.value.find(b => b.id === backupId)?.startedAt,
    });
    const updatedBackups = backupStorage.getByProjectId(projectId);
    backups.value = updatedBackups;

    const completedCount = updatedBackups.filter((b) =>
      b.id === backupId ? !currentValue : b.isCompleted
    ).length;
    
    const autoStatus = calculateAutoStatus(project, project.cardCount, project.recoveredCount, completedCount);
    
    const updates: Partial<WeddingProject> = {
      backupCount: completedCount,
    };

    if (autoStatus !== project.handoverStatus) {
      updates.handoverStatus = autoStatus;
      logActivity(
        projectId,
        'status_change',
        `状态从 ${HANDOVER_STATUS_LABELS[project.handoverStatus]} 变更为 ${HANDOVER_STATUS_LABELS[autoStatus]}`,
        {
          fromStatus: project.handoverStatus,
          toStatus: autoStatus,
          remark: !currentValue ? '标记备份完成后自动更新状态' : '取消备份完成后自动更新状态',
        }
      );
    }

    projectStorage.update(projectId, updates);

    logActivity(
      projectId,
      !currentValue ? 'backup_complete' : 'backup_uncomplete',
      !currentValue
        ? `标记备份 ${location} 已完成`
        : `取消备份 ${location} 完成状态`,
      {
        backupId,
        location,
        isCompleted: !currentValue,
      }
    );

    onUpdate$();
  });

  const verifyBackup = $((backupId: string, location: string) => {
    const backup = backups.value.find(b => b.id === backupId);
    if (!backup) return;

    const newVerifyStatus: BackupRecord['verifyStatus'] =
      backup.verifyStatus === 'verified' ? 'pending' : 'verified';

    backupStorage.update(backupId, {
      verifyStatus: newVerifyStatus,
      verifiedAt: newVerifyStatus === 'verified' ? new Date().toISOString() : null,
    });
    backups.value = backupStorage.getByProjectId(projectId);

    logActivity(
      projectId,
      'backup_verify',
      newVerifyStatus === 'verified'
        ? `备份 ${location} 验证通过`
        : `取消备份 ${location} 验证状态`,
      {
        backupId,
        location,
        verifyStatus: newVerifyStatus,
      }
    );

    onUpdate$();
  });

  const toggleExpand = $((backupId: string) => {
    expandedBackupId.value = expandedBackupId.value === backupId ? null : backupId;
  });

  const startEdit = $((backup: BackupRecord) => {
    editingBackupId.value = backup.id;
    editFileCount.value = backup.fileCount?.toString() || '';
    editTotalSize.value = backup.totalSize || '';
    editLocation.value = backup.location || '';
  });

  const cancelEdit = $(() => {
    editingBackupId.value = null;
    editFileCount.value = '';
    editTotalSize.value = '';
    editLocation.value = '';
  });

  const saveBackupEdit = $((backupId: string, oldLocation: string) => {
    const updates: Partial<BackupRecord> = {};
    if (editFileCount.value) {
      updates.fileCount = parseInt(editFileCount.value) || 0;
    }
    if (editTotalSize.value) {
      updates.totalSize = editTotalSize.value.trim();
    }
    if (editLocation.value) {
      updates.location = editLocation.value.trim();
    }

    if (Object.keys(updates).length > 0) {
      backupStorage.update(backupId, updates);
      backups.value = backupStorage.getByProjectId(projectId);

      logActivity(
        projectId,
        'project_edit',
        `更新备份 ${updates.location || oldLocation} 明细信息`,
        {
          backupId,
          ...updates,
        }
      );
    }

    cancelEdit();
    onUpdate$();
  });

  const deleteBackup = $((backupId: string, location: string) => {
    if (!confirm('确定要删除这个备份记录吗？')) return;
    backupStorage.delete(backupId);
    const remaining = backupStorage.getByProjectId(projectId);
    backups.value = remaining;

    const completedCount = remaining.filter((b) => b.isCompleted).length;
    
    const autoStatus = calculateAutoStatus(project, project.cardCount, project.recoveredCount, completedCount);
    
    const updates: Partial<WeddingProject> = {
      backupCount: completedCount,
    };

    if (autoStatus !== project.handoverStatus) {
      updates.handoverStatus = autoStatus;
      logActivity(
        projectId,
        'status_change',
        `状态从 ${HANDOVER_STATUS_LABELS[project.handoverStatus]} 变更为 ${HANDOVER_STATUS_LABELS[autoStatus]}`,
        {
          fromStatus: project.handoverStatus,
          toStatus: autoStatus,
          remark: '删除备份后自动更新状态',
        }
      );
    }

    projectStorage.update(projectId, updates);

    logActivity(
      projectId,
      'backup_delete',
      `删除备份位置 ${location}`,
      {
        backupId,
        location,
      }
    );

    onUpdate$();
  });

  const locationTypes = Object.keys(BACKUP_LOCATION_TYPE_LABELS);

  const backupsByType = backups.value.reduce((acc, backup) => {
    if (!acc[backup.locationType]) {
      acc[backup.locationType] = [];
    }
    acc[backup.locationType].push(backup);
    return acc;
  }, {} as Record<string, BackupRecord[]>);

  const filteredBackups = selectedType.value === 'all'
    ? backups.value
    : backupsByType[selectedType.value] || [];

  const completedCount = backups.value.filter((b) => b.isCompleted).length;
  const verifiedCount = backups.value.filter((b) => b.verifyStatus === 'verified').length;
  const totalCount = backups.value.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const allVerified = totalCount > 0 && verifiedCount === totalCount;

  const getTypeStats = (type: string) => {
    const list = type === 'all' ? backups.value : backupsByType[type] || [];
    const completed = list.filter(b => b.isCompleted).length;
    const verified = list.filter(b => b.verifyStatus === 'verified').length;
    return { total: list.length, completed, verified };
  };

  const quickLocations = [
    { name: 'NAS 存储', type: 'nas' as const },
    { name: '移动硬盘A', type: 'external_hdd' as const },
    { name: '移动硬盘B', type: 'external_hdd' as const },
    { name: '云端备份', type: 'cloud' as const },
    { name: '本地工作站', type: 'local' as const },
  ];

  const getVerifyStatusBadge = (status?: BackupRecord['verifyStatus']) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-wine-100 text-wine-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getVerifyStatusLabel = (status?: BackupRecord['verifyStatus']) => {
    switch (status) {
      case 'verified':
        return '✓ 已验证';
      case 'failed':
        return '✗ 验证失败';
      default:
        return '待验证';
    }
  };

  return (
    <div class="card-base">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h3 class="text-lg font-display font-semibold text-gray-700 flex items-center gap-2">
          <span class="w-1 h-6 bg-champagne-500 rounded-full" />
          备份进展
          <span class="text-sm font-normal text-gray-400">
            ({completedCount} / {totalCount} 已完成
            {verifiedCount > 0 && `, ${verifiedCount} 已验证`})
          </span>
        </h3>
        <div class="flex items-center gap-3">
          <button
            onClick$={() => (showAddForm.value = !showAddForm.value)}
            class="text-champagne-600 hover:text-champagne-700 text-sm font-medium transition-colors"
          >
            {showAddForm.value ? '取消' : '+ 添加备份'}
          </button>
        </div>
      </div>

      {showAddForm.value && (
        <div class="mb-6 p-4 bg-champagne-50 rounded-xl border border-champagne-100">
          <div class="space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">备份位置 *</label>
                <input
                  type="text"
                  value={newLocation.value}
                  onInput$={(e) => (newLocation.value = (e.target as HTMLInputElement).value)}
                  placeholder="如：NAS存储、移动硬盘等"
                  class="input-base text-sm"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">存储类型</label>
                <select
                  value={newLocationType.value}
                  onChange$={(e) => (newLocationType.value = (e.target as HTMLSelectElement).value as BackupRecord['locationType'])}
                  class="input-base text-sm appearance-none bg-white cursor-pointer"
                >
                  {locationTypes.map((type) => (
                    <option key={type} value={type}>
                      {`${BACKUP_LOCATION_TYPE_ICONS[type]} ${BACKUP_LOCATION_TYPE_LABELS[type]}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-2">快速选择：</p>
              <div class="flex flex-wrap gap-2">
                {quickLocations.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick$={() => {
                      newLocation.value = loc.name;
                      newLocationType.value = loc.type;
                    }}
                    class="px-3 py-1 text-xs bg-white border border-champagne-200 rounded-full text-champagne-700 hover:bg-champagne-100 transition-colors"
                  >
                    {BACKUP_LOCATION_TYPE_ICONS[loc.type]} {loc.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick$={addBackup}
              class="btn-primary text-sm py-2 px-6"
            >
              添加备份位置
            </button>
          </div>
        </div>
      )}

      {backups.value.length === 0 ? (
        <div class="text-center py-8 text-gray-400">
          <p class="text-4xl mb-2">💽</p>
          <p>暂无备份记录</p>
          <p class="text-sm mt-1">建议至少保留2份备份以确保数据安全</p>
        </div>
      ) : (
        <div class="flex gap-6">
          <div class="w-48 flex-shrink-0 border-r border-gray-100 pr-4 space-y-1">
            <button
              onClick$={() => (selectedType.value = 'all')}
              class={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-between ${
                selectedType.value === 'all'
                  ? 'bg-champagne-100 text-champagne-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span class="flex items-center gap-2">
                <span>📋</span>
                <span>全部位置</span>
              </span>
              <span class="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                {getTypeStats('all').total}
              </span>
            </button>
            {locationTypes.map((type) => {
              const stats = getTypeStats(type);
              if (stats.total === 0) return null;
              return (
                <button
                  key={type}
                  onClick$={() => (selectedType.value = type)}
                  class={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-between ${
                    selectedType.value === type
                      ? 'bg-champagne-100 text-champagne-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span class="flex items-center gap-2">
                    <span>{BACKUP_LOCATION_TYPE_ICONS[type]}</span>
                    <span>{BACKUP_LOCATION_TYPE_LABELS[type]}</span>
                  </span>
                  <span class="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                    {stats.completed}/{stats.total}
                  </span>
                </button>
              );
            })}
          </div>

          <div class="flex-1 min-w-0">
            <div class="mb-4 flex items-center justify-between">
              <p class="text-sm text-gray-500">
                {selectedType.value === 'all'
                  ? `共 ${totalCount} 个备份位置`
                  : `${BACKUP_LOCATION_TYPE_LABELS[selectedType.value]} 共 ${getTypeStats(selectedType.value).total} 个`}
              </p>
              {selectedType.value !== 'all' && (
                <span class="text-xs text-gray-400">
                  点击卡片查看详情
                </span>
              )}
            </div>

            <div class="space-y-3">
              {filteredBackups.map((backup) => {
                const isExpanded = expandedBackupId.value === backup.id;
                const isEditing = editingBackupId.value === backup.id;

                return (
                  <div
                    key={backup.id}
                    class={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      backup.isCompleted
                        ? 'bg-green-50/50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-champagne-200'
                    }`}
                  >
                    <div
                      class="p-4 cursor-pointer"
                      onClick$={() => toggleExpand(backup.id)}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <div class={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                            backup.isCompleted ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                            {backup.isCompleted ? '✅' : BACKUP_LOCATION_TYPE_ICONS[backup.locationType]}
                          </div>
                          <div>
                            <div class="flex items-center gap-2 flex-wrap">
                              <p class="font-medium text-gray-800">{backup.location}</p>
                              <span class={`badge-base text-xs ${
                                backup.locationType === 'nas' ? 'bg-blue-100 text-blue-600' :
                                backup.locationType === 'external_hdd' ? 'bg-purple-100 text-purple-600' :
                                backup.locationType === 'cloud' ? 'bg-sky-100 text-sky-600' :
                                backup.locationType === 'local' ? 'bg-orange-100 text-orange-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {BACKUP_LOCATION_TYPE_LABELS[backup.locationType]}
                              </span>
                              {backup.verifyStatus && (
                                <span class={`badge-base text-xs ${getVerifyStatusBadge(backup.verifyStatus)}`}>
                                  {getVerifyStatusLabel(backup.verifyStatus)}
                                </span>
                              )}
                            </div>
                            <p class="text-sm text-gray-500 mt-0.5">
                              {backup.isCompleted
                                ? backup.completedAt
                                  ? `完成于 ${formatDateTime(backup.completedAt)}`
                                  : '已完成'
                                : backup.startedAt
                                  ? `开始于 ${formatDateTime(backup.startedAt)}`
                                  : '备份进行中...'}
                            </p>
                          </div>
                        </div>
                        <div class="flex items-center gap-3">
                          {(backup.fileCount || backup.totalSize) && !isExpanded && (
                            <div class="hidden sm:flex gap-3 text-xs text-gray-500">
                              {backup.fileCount && <span>📁 {backup.fileCount}</span>}
                              {backup.totalSize && <span>💾 {backup.totalSize}</span>}
                            </div>
                          )}
                          <span class={`text-lg transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}>
                            ▼
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div class="px-4 pb-4 border-t border-gray-100 pt-3">
                        {isEditing ? (
                          <div class="space-y-3">
                            <div>
                              <label class="block text-xs text-gray-500 mb-1">备份位置</label>
                              <input
                                type="text"
                                value={editLocation.value}
                                onInput$={(e) => (editLocation.value = (e.target as HTMLInputElement).value)}
                                class="input-base text-sm py-1.5"
                              />
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                              <div>
                                <label class="block text-xs text-gray-500 mb-1">文件数量</label>
                                <input
                                  type="number"
                                  value={editFileCount.value}
                                  onInput$={(e) => (editFileCount.value = (e.target as HTMLInputElement).value)}
                                  placeholder="如：1250"
                                  class="input-base text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label class="block text-xs text-gray-500 mb-1">总大小</label>
                                <input
                                  type="text"
                                  value={editTotalSize.value}
                                  onInput$={(e) => (editTotalSize.value = (e.target as HTMLInputElement).value)}
                                  placeholder="如：500GB"
                                  class="input-base text-sm py-1.5"
                                />
                              </div>
                            </div>
                            <div class="flex gap-2 justify-end">
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); cancelEdit(); }}
                                class="btn-secondary text-sm py-1.5 px-4"
                              >
                                取消
                              </button>
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); saveBackupEdit(backup.id, backup.location); }}
                                class="btn-primary text-sm py-1.5 px-4"
                              >
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div class="space-y-3">
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">存储类型</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {BACKUP_LOCATION_TYPE_ICONS[backup.locationType]} {BACKUP_LOCATION_TYPE_LABELS[backup.locationType]}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">备份状态</p>
                                <p class={`text-sm font-medium ${
                                  backup.isCompleted ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  {backup.isCompleted ? '已完成' : '进行中'}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">验证状态</p>
                                <p class={`text-sm font-medium ${
                                  backup.verifyStatus === 'verified' ? 'text-green-600' :
                                  backup.verifyStatus === 'failed' ? 'text-wine-600' : 'text-gray-500'
                                }`}>
                                  {getVerifyStatusLabel(backup.verifyStatus)}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">文件数量</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {backup.fileCount ? `${backup.fileCount} 个` : '-'}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">总大小</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {backup.totalSize || '-'}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">开始时间</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {backup.startedAt ? formatDateTime(backup.startedAt) : '-'}
                                </p>
                              </div>
                            </div>
                            {backup.completedAt && (
                              <p class="text-xs text-green-600">
                                完成时间：{formatDateTime(backup.completedAt)}
                              </p>
                            )}
                            {backup.verifiedAt && (
                              <p class="text-xs text-blue-600">
                                验证时间：{formatDateTime(backup.verifiedAt)}
                              </p>
                            )}
                            <div class="flex gap-2 justify-end flex-wrap">
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); deleteBackup(backup.id, backup.location); }}
                                class="text-wine-400 hover:text-wine-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
                              >
                                删除
                              </button>
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); startEdit(backup); }}
                                class="text-gray-500 hover:text-champagne-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
                              >
                                编辑
                              </button>
                              {backup.isCompleted && (
                                <button
                                  onClick$={(e: MouseEvent) => { e.stopPropagation(); verifyBackup(backup.id, backup.location); }}
                                  class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    backup.verifyStatus === 'verified'
                                      ? 'bg-green-200 text-green-700 hover:bg-green-300'
                                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  }`}
                                >
                                  {backup.verifyStatus === 'verified' ? '取消验证' : '验证通过'}
                                </button>
                              )}
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); toggleComplete(backup.id, backup.isCompleted, backup.location); }}
                                class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  backup.isCompleted
                                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                {backup.isCompleted ? '标为未完成' : '标记完成'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <div class="mt-6 pt-4 border-t border-gray-100">
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">备份进度</span>
                <span class={allCompleted ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                  {allCompleted ? '✓ 全部备份完成' : `${completedCount} / ${totalCount}`}
                </span>
              </div>
              <div class="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class={`h-full rounded-full transition-all duration-500 ${
                    allCompleted ? 'bg-green-500' : 'bg-champagne-500'
                  }`}
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
            {verifiedCount > 0 && (
              <div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">验证进度</span>
                  <span class={allVerified ? 'text-green-600 font-medium' : 'text-blue-600'}>
                    {allVerified ? '✓ 全部验证通过' : `${verifiedCount} / ${totalCount}`}
                  </span>
                </div>
                <div class="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {totalCount < 2 && (
            <p class="mt-4 text-xs text-yellow-600">
              ⚠️ 建议至少保留2份备份以确保数据安全
            </p>
          )}
          <div class="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
            {locationTypes.map((type) => {
              const count = backupsByType[type]?.length || 0;
              if (count === 0) return null;
              return (
                <div key={type} class="flex items-center gap-1">
                  <span>{BACKUP_LOCATION_TYPE_ICONS[type]}</span>
                  <span>{BACKUP_LOCATION_TYPE_LABELS[type]}: {count}个</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
