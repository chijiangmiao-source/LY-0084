import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { BackupRecord, WeddingProject } from '~/types/project';
import { backupStorage, projectStorage } from '~/utils/storage';
import { formatDateTime } from '~/utils/dateUtils';

interface BackupStatusProps {
  projectId: string;
  project: WeddingProject;
  onUpdate$: () => void;
}

export const BackupStatus = component$<BackupStatusProps>(({ projectId, project, onUpdate$ }) => {
  const backups = useSignal<BackupRecord[]>([]);
  const newLocation = useSignal('');
  const showAddForm = useSignal(false);

  useVisibleTask$(() => {
    backups.value = backupStorage.getByProjectId(projectId);
  });

  const addBackup = $(() => {
    if (!newLocation.value.trim()) return;

    backupStorage.create({
      projectId,
      location: newLocation.value.trim(),
      isCompleted: false,
      completedAt: null,
    });

    newLocation.value = '';
    showAddForm.value = false;
    backups.value = backupStorage.getByProjectId(projectId);
  });

  const toggleComplete = $((backupId: string, currentValue: boolean) => {
    backupStorage.update(backupId, {
      isCompleted: !currentValue,
      completedAt: !currentValue ? new Date().toISOString() : null,
    });
    const updatedBackups = backupStorage.getByProjectId(projectId);
    backups.value = updatedBackups;

    const completedCount = updatedBackups.filter((b) =>
      b.id === backupId ? !currentValue : b.isCompleted
    ).length;
    projectStorage.update(projectId, { backupCount: completedCount });
    onUpdate$();
  });

  const deleteBackup = $((backupId: string) => {
    if (!confirm('确定要删除这个备份记录吗？')) return;
    backupStorage.delete(backupId);
    const remaining = backupStorage.getByProjectId(projectId);
    backups.value = remaining;

    const completedCount = remaining.filter((b) => b.isCompleted).length;
    projectStorage.update(projectId, { backupCount: completedCount });
    onUpdate$();
  });

  const completedCount = backups.value.filter((b) => b.isCompleted).length;
  const totalCount = backups.value.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const quickLocations = ['NAS 存储', '移动硬盘A', '移动硬盘B', '云端备份', '本地工作站'];

  return (
    <div class="card-base">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-display font-semibold text-gray-700 flex items-center gap-2">
          <span class="w-1 h-6 bg-champagne-500 rounded-full" />
          备份状态
          <span class="text-sm font-normal text-gray-400">
            ({completedCount} / {totalCount} 已完成)
          </span>
        </h3>
        <button
          onClick$={() => (showAddForm.value = !showAddForm.value)}
          class="text-champagne-600 hover:text-champagne-700 text-sm font-medium transition-colors"
        >
          {showAddForm.value ? '取消' : '+ 添加备份'}
        </button>
      </div>

      {showAddForm.value && (
        <div class="mb-6 p-4 bg-champagne-50 rounded-xl border border-champagne-100">
          <div class="space-y-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">备份位置</label>
              <input
                type="text"
                value={newLocation.value}
                onInput$={(e) => (newLocation.value = (e.target as HTMLInputElement).value)}
                placeholder="如：NAS存储、移动硬盘等"
                class="input-base text-sm"
              />
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-2">快速选择：</p>
              <div class="flex flex-wrap gap-2">
                {quickLocations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick$={() => (newLocation.value = loc)}
                    class="px-3 py-1 text-xs bg-white border border-champagne-200 rounded-full text-champagne-700 hover:bg-champagne-100 transition-colors"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick$={addBackup}
              class="btn-primary w-full text-sm py-2"
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
        <div class="space-y-3">
          {backups.value.map((backup) => (
            <div
              key={backup.id}
              class={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                backup.isCompleted
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div class="flex items-center gap-4">
                <div class={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  backup.isCompleted ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {backup.isCompleted ? '✅' : '⏳'}
                </div>
                <div>
                  <p class="font-medium text-gray-800">{backup.location}</p>
                  <p class="text-sm text-gray-500">
                    {backup.isCompleted
                      ? backup.completedAt
                        ? `完成于 ${formatDateTime(backup.completedAt)}`
                        : '已完成'
                      : '备份进行中...'}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <button
                  onClick$={() => toggleComplete(backup.id, backup.isCompleted)}
                  class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    backup.isCompleted
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {backup.isCompleted ? '标为未完成' : '标记完成'}
                </button>
                <button
                  onClick$={() => deleteBackup(backup.id)}
                  class="text-wine-400 hover:text-wine-600 text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalCount > 0 && (
        <div class="mt-6 pt-4 border-t border-gray-100">
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
          {totalCount < 2 && (
            <p class="mt-2 text-xs text-yellow-600">
              ⚠️ 建议至少保留2份备份以确保数据安全
            </p>
          )}
        </div>
      )}
    </div>
  );
});
