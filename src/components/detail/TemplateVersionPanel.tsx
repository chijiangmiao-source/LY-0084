import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type {
  WeddingProject,
  HandoverTemplate,
  TemplateDiff,
  TemplateVersion,
  SyncStrategy,
} from '~/types/project';
import {
  SYNC_STRATEGY_LABELS,
  SYNC_STRATEGY_DESCRIPTIONS,
} from '~/types/project';
import {
  templateStorage,
  templateVersionStorage,
  getProjectTemplateDiff,
  updateProjectSyncStrategy,
  applySelectiveSync,
  calculateTemplateDiff,
  type SelectiveSyncOptions,
} from '~/utils/storage';
import { formatDateTime } from '~/utils/dateUtils';
import { TemplateDiffViewer } from './TemplateDiffViewer';

interface TemplateVersionPanelProps {
  projectId: string;
  project: WeddingProject;
  onUpdate$: () => void;
}

export const TemplateVersionPanel = component$<TemplateVersionPanelProps>(({ projectId, project, onUpdate$ }) => {
  const linkedTemplate = useSignal<HandoverTemplate | null>(null);
  const templateVersions = useSignal<TemplateVersion[]>([]);
  const currentDiff = useSignal<TemplateDiff | null>(null);
  const showDiffModal = useSignal(false);
  const showSyncOptions = useSignal(false);
  const showVersionHistory = useSignal(false);
  const isLoading = useSignal(true);

  const syncStorageCards = useSignal(true);
  const syncBackupLocations = useSignal(true);
  const syncMissingItems = useSignal(true);
  const syncHandoverNote = useSignal(true);

  const handleUpdate = $(() => {
    onUpdate$();
  });

  useVisibleTask$(() => {
    if (project.templateId) {
      linkedTemplate.value = templateStorage.getById(project.templateId) || null;
      templateVersions.value = templateVersionStorage.getByTemplateId(project.templateId);
      currentDiff.value = getProjectTemplateDiff(projectId);
    }
    isLoading.value = false;
  });

  const refreshData = $(() => {
    if (project.templateId) {
      linkedTemplate.value = templateStorage.getById(project.templateId) || null;
      templateVersions.value = templateVersionStorage.getByTemplateId(project.templateId);
      currentDiff.value = getProjectTemplateDiff(projectId);
    }
    handleUpdate();
  });

  const handleStrategyChange = $((strategy: SyncStrategy) => {
    const confirmed = confirm(
      `确定要将同步策略更改为「${SYNC_STRATEGY_LABELS[strategy]}」吗？\n\n${SYNC_STRATEGY_DESCRIPTIONS[strategy]}`
    );
    if (confirmed) {
      updateProjectSyncStrategy(projectId, strategy);
      refreshData();
    }
  });

  const handleApplySync = $(() => {
    if (!currentDiff.value) return;

    const options: SelectiveSyncOptions = {
      syncStorageCards: syncStorageCards.value,
      syncBackupLocations: syncBackupLocations.value,
      syncMissingItems: syncMissingItems.value,
      syncHandoverNote: syncHandoverNote.value,
    };

    const hasAnySelected =
      options.syncStorageCards ||
      options.syncBackupLocations ||
      options.syncMissingItems ||
      options.syncHandoverNote;

    if (!hasAnySelected) {
      alert('请至少选择一项要同步的内容');
      return;
    }

    const result = applySelectiveSync(projectId, currentDiff.value, options);

    if (result.applied.length > 0) {
      alert(`同步完成！\n\n已同步：\n${result.applied.join('\n')}\n\n${result.skipped.length > 0 ? '跳过：\n' + result.skipped.join('\n') : ''}`);
    } else {
      alert(`同步未执行：\n${result.skipped.join('\n')}`);
    }

    showSyncOptions.value = false;
    refreshData();
  });

  if (isLoading.value) {
    return (
      <div class="card-base">
        <p class="text-center text-gray-500 py-8">加载中...</p>
      </div>
    );
  }

  if (!project.templateSnapshot || !linkedTemplate.value) {
    return (
      <div class="card-base">
        <div class="text-center py-8">
          <p class="text-4xl mb-2">📋</p>
          <p class="text-gray-500">本项目未使用模板</p>
        </div>
      </div>
    );
  }

  const snapshot = project.templateSnapshot;
  const template = linkedTemplate.value;
  const diff = currentDiff.value;
  const hasPendingUpdates = diff?.hasChanges || false;
  const currentVersion = snapshot.versionNumber;
  const latestVersion = template.currentVersion;

  return (
    <div class="card-base">
      <h3 class="text-lg font-display font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span class="w-1 h-6 bg-champagne-500 rounded-full" />
        模板版本与同步
      </h3>

      <div class="mb-6 p-4 bg-gradient-to-r from-champagne-50 to-wine-50 rounded-xl border border-champagne-100">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 bg-champagne-200 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              {template.icon}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-gray-800">{template.name}</p>
                {template.isDefault && (
                  <span class="text-[10px] bg-champagne-100 text-champagne-700 px-2 py-0.5 rounded-full">
                    默认模板
                  </span>
                )}
              </div>
              <p class="text-sm text-gray-500 mt-0.5">{template.description}</p>
            </div>
          </div>
          {hasPendingUpdates && (
            <div class="flex-shrink-0">
              <span class="inline-flex items-center gap-1 bg-wine-100 text-wine-700 px-3 py-1 rounded-full text-xs font-medium">
                <span>🔔</span>
                <span>有更新</span>
              </span>
            </div>
          )}
        </div>

        <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-white/70 rounded-lg p-3">
            <p class="text-xs text-gray-500 mb-1">当前使用版本</p>
            <p class="text-lg font-bold text-champagne-600">v{currentVersion}</p>
          </div>
          <div class="bg-white/70 rounded-lg p-3">
            <p class="text-xs text-gray-500 mb-1">最新模板版本</p>
            <p class={`text-lg font-bold ${hasPendingUpdates ? 'text-wine-600' : 'text-green-600'}`}>
              v{latestVersion}
            </p>
          </div>
          <div class="bg-white/70 rounded-lg p-3">
            <p class="text-xs text-gray-500 mb-1">应用时间</p>
            <p class="text-sm font-medium text-gray-700">
              {formatDateTime(snapshot.appliedAt)}
            </p>
          </div>
          <div class="bg-white/70 rounded-lg p-3">
            <p class="text-xs text-gray-500 mb-1">同步策略</p>
            <p class={`text-sm font-medium ${
              snapshot.syncStrategy === 'auto' ? 'text-blue-600' :
              snapshot.syncStrategy === 'selective' ? 'text-champagne-600' :
              'text-gray-600'
            }`}>
              {snapshot.syncStrategy === 'auto' ? '⚡' :
               snapshot.syncStrategy === 'selective' ? '🎯' : '🔒'}
              {' '}{SYNC_STRATEGY_LABELS[snapshot.syncStrategy]}
            </p>
          </div>
        </div>
      </div>

      {hasPendingUpdates && (
        <div class="mb-4 p-3 bg-wine-50 border border-wine-200 rounded-xl">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2">
              <span class="text-wine-500 text-lg">⚠️</span>
              <div>
                <p class="text-sm font-medium text-wine-700">
                  模板已更新到 v{latestVersion}
                </p>
                <p class="text-xs text-wine-600 mt-0.5">
                  您的项目使用的是 v{currentVersion}，有 {diff!.storageCards.length + diff!.backupLocations.length + diff!.missingItems.length + (diff!.handoverNote ? 1 : 0)} 项变更可用
                </p>
              </div>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button
                onClick$={() => (showDiffModal.value = true)}
                class="text-xs text-wine-700 hover:text-wine-800 bg-wine-100 hover:bg-wine-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                查看差异
              </button>
              {snapshot.syncStrategy !== 'locked' && (
                <button
                  onClick$={() => {
                    showSyncOptions.value = true;
                    syncStorageCards.value = true;
                    syncBackupLocations.value = true;
                    syncMissingItems.value = true;
                    syncHandoverNote.value = true;
                  }}
                  class="text-xs text-white bg-wine-500 hover:bg-wine-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  同步更新
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasPendingUpdates && (
        <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
          <div class="flex items-center gap-2">
            <span class="text-green-500 text-lg">✓</span>
            <p class="text-sm text-green-700">
              项目模板已是最新版本 (v{currentVersion})
            </p>
          </div>
        </div>
      )}

      <div class="mb-4">
        <p class="text-sm font-medium text-gray-700 mb-2">同步策略设置</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['auto', 'selective', 'locked'] as SyncStrategy[]).map((strategy) => {
            const isSelected = snapshot.syncStrategy === strategy;
            return (
              <button
                key={strategy}
                onClick$={() => handleStrategyChange(strategy)}
                class={`text-left p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-champagne-500 bg-champagne-50/50'
                    : 'border-gray-200 hover:border-champagne-300 bg-white'
                }`}
              >
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base">
                    {strategy === 'auto' ? '⚡' : strategy === 'selective' ? '🎯' : '🔒'}
                  </span>
                  <p class={`text-sm font-medium ${
                    isSelected ? 'text-champagne-700' : 'text-gray-800'
                  }`}>
                    {SYNC_STRATEGY_LABELS[strategy]}
                  </p>
                  {isSelected && (
                    <span class="ml-auto text-champagne-500">✓</span>
                  )}
                </div>
                <p class="text-xs text-gray-500 leading-relaxed">
                  {SYNC_STRATEGY_DESCRIPTIONS[strategy]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div class="flex gap-3 pt-3 border-t border-gray-100">
        <button
          onClick$={() => (showVersionHistory.value = true)}
          class="flex-1 text-sm text-gray-600 hover:text-champagne-600 bg-gray-50 hover:bg-gray-100 py-2 rounded-xl transition-colors"
        >
          📜 查看模板版本历史
        </button>
        {hasPendingUpdates && snapshot.syncStrategy !== 'locked' && (
          <button
            onClick$={() => (showDiffModal.value = true)}
            class="flex-1 text-sm text-champagne-600 hover:text-champagne-700 bg-champagne-50 hover:bg-champagne-100 py-2 rounded-xl transition-colors"
          >
            🔍 对比版本差异
          </button>
        )}
      </div>

      {showDiffModal.value && diff && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-display font-semibold text-gray-800">
                版本差异对比：v{currentVersion} → v{latestVersion}
              </h2>
              <button
                onClick$={() => (showDiffModal.value = false)}
                class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6">
              <TemplateDiffViewer diff={diff} />
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick$={() => (showDiffModal.value = false)}
                class="btn-secondary"
              >
                关闭
              </button>
              {snapshot.syncStrategy !== 'locked' && (
                <button
                  onClick$={() => {
                    showDiffModal.value = false;
                    showSyncOptions.value = true;
                  }}
                  class="btn-primary"
                >
                  去同步更新
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSyncOptions.value && diff && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-display font-semibold text-gray-800">
                选择性同步更新
              </h2>
              <button
                onClick$={() => (showSyncOptions.value = false)}
                class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div class="p-6 space-y-4">
              <p class="text-sm text-gray-600 mb-4">
                选择要同步到项目的内容。已完成/已回收/已解决的内容不会被修改。
              </p>

              {diff.storageCards.length > 0 && (
                <label class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={syncStorageCards.value}
                    onChange$={(e) => (syncStorageCards.value = (e.target as HTMLInputElement).checked)}
                    class="w-5 h-5 mt-0.5 text-champagne-600 rounded"
                  />
                  <div>
                    <p class="font-medium text-gray-800">
                      存储卡配置 <span class="text-wine-500">({diff.storageCards.length} 项变更)</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      未回收的存储卡将按新模板重新生成
                    </p>
                  </div>
                </label>
              )}

              {diff.backupLocations.length > 0 && (
                <label class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={syncBackupLocations.value}
                    onChange$={(e) => (syncBackupLocations.value = (e.target as HTMLInputElement).checked)}
                    class="w-5 h-5 mt-0.5 text-champagne-600 rounded"
                  />
                  <div>
                    <p class="font-medium text-gray-800">
                      备份位置配置 <span class="text-wine-500">({diff.backupLocations.length} 项变更)</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      未完成的备份位置将按新模板重新生成
                    </p>
                  </div>
                </label>
              )}

              {diff.missingItems.length > 0 && (
                <label class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={syncMissingItems.value}
                    onChange$={(e) => (syncMissingItems.value = (e.target as HTMLInputElement).checked)}
                    class="w-5 h-5 mt-0.5 text-champagne-600 rounded"
                  />
                  <div>
                    <p class="font-medium text-gray-800">
                      核对项配置 <span class="text-wine-500">({diff.missingItems.length} 项变更)</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      未解决的核对项将按新模板重新生成
                    </p>
                  </div>
                </label>
              )}

              {diff.handoverNote && (
                <label class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={syncHandoverNote.value}
                    onChange$={(e) => (syncHandoverNote.value = (e.target as HTMLInputElement).checked)}
                    class="w-5 h-5 mt-0.5 text-champagne-600 rounded"
                  />
                  <div>
                    <p class="font-medium text-gray-800">
                      交接备注 <span class="text-wine-500">(有变更)</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      项目的交接备注将被模板内容覆盖
                    </p>
                  </div>
                </label>
              )}
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick$={() => (showSyncOptions.value = false)}
                class="btn-secondary"
              >
                取消
              </button>
              <button
                onClick$={handleApplySync}
                class="btn-primary"
              >
                确认同步
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionHistory.value && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-display font-semibold text-gray-800">
                模板版本历史
              </h2>
              <button
                onClick$={() => (showVersionHistory.value = false)}
                class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6">
              {templateVersions.value.length === 0 ? (
                <div class="text-center py-8 text-gray-500">
                  <p class="text-4xl mb-2">📜</p>
                  <p>暂无版本历史记录</p>
                </div>
              ) : (
                <div class="space-y-4">
                  {templateVersions.value.map((version, index) => {
                    const isCurrent = version.version === currentVersion;
                    const isLatest = version.version === latestVersion;
                    return (
                      <div
                        key={version.id}
                        class={`p-4 rounded-xl border-2 ${
                          isCurrent
                            ? 'border-champagne-500 bg-champagne-50/50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div class="flex items-start justify-between gap-3 mb-2">
                          <div class="flex items-center gap-2">
                            <span class="text-lg font-bold text-champagne-600">
                              v{version.version}
                            </span>
                            {isCurrent && (
                              <span class="text-xs bg-champagne-200 text-champagne-700 px-2 py-0.5 rounded-full">
                                当前使用
                              </span>
                            )}
                            {isLatest && !isCurrent && (
                              <span class="text-xs bg-wine-100 text-wine-700 px-2 py-0.5 rounded-full">
                                最新
                              </span>
                            )}
                          </div>
                          <span class="text-xs text-gray-500">
                            {formatDateTime(version.createdAt)}
                          </span>
                        </div>
                        {version.changeLog && (
                          <p class="text-sm text-gray-600 mb-2">
                            {version.changeLog}
                          </p>
                        )}
                        <div class="flex gap-4 text-xs text-gray-500">
                          <span>💾 {version.storageCards.length} 张存储卡</span>
                          <span>🖥️ {version.backupLocations.length} 个备份位置</span>
                          <span>✅ {version.missingItems.length} 项核对项</span>
                        </div>
                        {index < templateVersions.value.length - 1 && (
                          <div class="mt-3 pt-3 border-t border-gray-100">
                            <p class="text-xs text-gray-500 mb-2">相比上一版本的变更：</p>
                            <TemplateDiffViewer
                              diff={calculateTemplateDiff(
                                templateVersions.value[index + 1],
                                version
                              )}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick$={() => (showVersionHistory.value = false)}
                class="btn-primary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
