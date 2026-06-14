import { component$ } from '@builder.io/qwik';
import type {
  TemplateDiff,
  DiffItem,
  TemplateStorageCard,
  TemplateBackupLocation,
  TemplateMissingItem,
} from '~/types/project';
import {
  DEVICE_TYPE_LABELS,
  DEVICE_TYPE_ICONS,
  BACKUP_LOCATION_TYPE_LABELS,
  BACKUP_LOCATION_TYPE_ICONS,
  MISSING_SEVERITY_LABELS,
} from '~/types/project';

interface TemplateDiffViewerProps {
  diff: TemplateDiff;
  compact?: boolean;
}

export const TemplateDiffViewer = component$<TemplateDiffViewerProps>(({ diff, compact = false }) => {
  const getTypeIcon = (type: string) => {
    if (type === 'added') return '➕';
    if (type === 'removed') return '➖';
    return '✏️';
  };

  const getTypeLabel = (type: string) => {
    if (type === 'added') return '新增';
    if (type === 'removed') return '删除';
    return '修改';
  };

  const getTypeColor = (type: string) => {
    if (type === 'added') return 'text-green-600 bg-green-50 border-green-200';
    if (type === 'removed') return 'text-wine-600 bg-wine-50 border-wine-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const renderStorageCardDiff = (item: DiffItem<TemplateStorageCard>, idx: number) => {
    const value = item.type === 'removed' ? item.oldValue! : item.newValue!;
    return (
      <div
        key={`card-${idx}`}
        class={`p-3 rounded-xl border ${getTypeColor(item.type)}`}
      >
        <div class="flex items-start gap-2">
          <span class="flex-shrink-0">{getTypeIcon(item.type)}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium">
                {DEVICE_TYPE_ICONS[value.deviceType]} {value.cardLabel}
              </span>
              <span class={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(item.type)}`}>
                {getTypeLabel(item.type)}
              </span>
            </div>
            {!compact && (
              <div class="text-xs mt-1 space-y-0.5">
                <p>
                  <span class="text-gray-500">设备类型：</span>
                  {DEVICE_TYPE_LABELS[value.deviceType]}
                </p>
                <p>
                  <span class="text-gray-500">设备名称：</span>
                  {value.deviceName || '-'}
                </p>
                <p>
                  <span class="text-gray-500">容量：</span>
                  {value.capacity}
                </p>
                {item.type === 'modified' && item.oldValue && item.newValue && (
                  <div class="mt-2 pt-2 border-t border-gray-200/50 space-y-1">
                    <p class="text-gray-500">变更详情：</p>
                    {item.oldValue.deviceName !== item.newValue.deviceName && (
                      <p>
                        <span class="text-wine-500 line-through">{item.oldValue.deviceName || '-'}</span>
                        {' → '}
                        <span class="text-green-600">{item.newValue.deviceName || '-'}</span>
                      </p>
                    )}
                    {item.oldValue.capacity !== item.newValue.capacity && (
                      <p>
                        <span class="text-wine-500 line-through">{item.oldValue.capacity}</span>
                        {' → '}
                        <span class="text-green-600">{item.newValue.capacity}</span>
                      </p>
                    )}
                    {item.oldValue.deviceType !== item.newValue.deviceType && (
                      <p>
                        <span class="text-wine-500 line-through">{DEVICE_TYPE_LABELS[item.oldValue.deviceType]}</span>
                        {' → '}
                        <span class="text-green-600">{DEVICE_TYPE_LABELS[item.newValue.deviceType]}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBackupDiff = (item: DiffItem<TemplateBackupLocation>, idx: number) => {
    const value = item.type === 'removed' ? item.oldValue! : item.newValue!;
    return (
      <div
        key={`backup-${idx}`}
        class={`p-3 rounded-xl border ${getTypeColor(item.type)}`}
      >
        <div class="flex items-start gap-2">
          <span class="flex-shrink-0">{getTypeIcon(item.type)}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium">
                {BACKUP_LOCATION_TYPE_ICONS[value.locationType]} {value.location}
              </span>
              <span class={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(item.type)}`}>
                {getTypeLabel(item.type)}
              </span>
            </div>
            {!compact && (
              <div class="text-xs mt-1 space-y-0.5">
                <p>
                  <span class="text-gray-500">存储类型：</span>
                  {BACKUP_LOCATION_TYPE_LABELS[value.locationType]}
                </p>
                {item.type === 'modified' && item.oldValue && item.newValue && (
                  <div class="mt-2 pt-2 border-t border-gray-200/50 space-y-1">
                    <p class="text-gray-500">变更详情：</p>
                    {item.oldValue.location !== item.newValue.location && (
                      <p>
                        <span class="text-wine-500 line-through">{item.oldValue.location}</span>
                        {' → '}
                        <span class="text-green-600">{item.newValue.location}</span>
                      </p>
                    )}
                    {item.oldValue.locationType !== item.newValue.locationType && (
                      <p>
                        <span class="text-wine-500 line-through">{BACKUP_LOCATION_TYPE_LABELS[item.oldValue.locationType]}</span>
                        {' → '}
                        <span class="text-green-600">{BACKUP_LOCATION_TYPE_LABELS[item.newValue.locationType]}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMissingDiff = (item: DiffItem<TemplateMissingItem>, idx: number) => {
    const value = item.type === 'removed' ? item.oldValue! : item.newValue!;
    const severityColors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-wine-100 text-wine-700',
    };
    return (
      <div
        key={`missing-${idx}`}
        class={`p-3 rounded-xl border ${getTypeColor(item.type)}`}
      >
        <div class="flex items-start gap-2">
          <span class="flex-shrink-0">{getTypeIcon(item.type)}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-2 flex-wrap">
              <span class="text-sm font-medium flex-1">{value.description}</span>
              <span class={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(item.type)}`}>
                {getTypeLabel(item.type)}
              </span>
            </div>
            <span class={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${severityColors[value.severity]}`}>
              {MISSING_SEVERITY_LABELS[value.severity]}
            </span>
            {!compact && item.type === 'modified' && item.oldValue && item.newValue && (
              <div class="mt-2 pt-2 border-t border-gray-200/50 space-y-1">
                <p class="text-xs text-gray-500">变更详情：</p>
                {item.oldValue.description !== item.newValue.description && (
                  <p class="text-xs">
                    <span class="text-wine-500 line-through">{item.oldValue.description}</span>
                    {' → '}
                    <span class="text-green-600">{item.newValue.description}</span>
                  </p>
                )}
                {item.oldValue.severity !== item.newValue.severity && (
                  <p class="text-xs">
                    <span class="text-wine-500 line-through">{MISSING_SEVERITY_LABELS[item.oldValue.severity]}</span>
                    {' → '}
                    <span class="text-green-600">{MISSING_SEVERITY_LABELS[item.newValue.severity]}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!diff.hasChanges) {
    return (
      <div class="text-center py-8">
        <p class="text-4xl mb-2">✅</p>
        <p class="text-gray-500">两个版本内容一致，无差异</p>
      </div>
    );
  }

  const totalChanges =
    diff.storageCards.length +
    diff.backupLocations.length +
    diff.missingItems.length +
    (diff.handoverNote ? 1 : 0);

  return (
    <div class="space-y-6">
      {!compact && (
        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-800">{totalChanges}</p>
            <p class="text-xs text-gray-500">项变更</p>
          </div>
          <div class="flex gap-4 text-xs">
            {diff.storageCards.length > 0 && (
              <span class="flex items-center gap-1">
                <span>💾</span>
                <span>{diff.storageCards.length} 张存储卡</span>
              </span>
            )}
            {diff.backupLocations.length > 0 && (
              <span class="flex items-center gap-1">
                <span>🖥️</span>
                <span>{diff.backupLocations.length} 个备份位置</span>
              </span>
            )}
            {diff.missingItems.length > 0 && (
              <span class="flex items-center gap-1">
                <span>✅</span>
                <span>{diff.missingItems.length} 项核对项</span>
              </span>
            )}
            {diff.handoverNote && (
              <span class="flex items-center gap-1">
                <span>📝</span>
                <span>1 项交接备注</span>
              </span>
            )}
          </div>
        </div>
      )}

      {diff.storageCards.length > 0 && (
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-champagne-500 rounded-full" />
            存储卡配置变更
            <span class="text-xs font-normal text-gray-500">({diff.storageCards.length} 项)</span>
          </h4>
          <div class="space-y-2">
            {diff.storageCards.map(renderStorageCardDiff)}
          </div>
        </div>
      )}

      {diff.backupLocations.length > 0 && (
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-blue-500 rounded-full" />
            备份位置配置变更
            <span class="text-xs font-normal text-gray-500">({diff.backupLocations.length} 项)</span>
          </h4>
          <div class="space-y-2">
            {diff.backupLocations.map(renderBackupDiff)}
          </div>
        </div>
      )}

      {diff.missingItems.length > 0 && (
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-wine-500 rounded-full" />
            核对项配置变更
            <span class="text-xs font-normal text-gray-500">({diff.missingItems.length} 项)</span>
          </h4>
          <div class="space-y-2">
            {diff.missingItems.map(renderMissingDiff)}
          </div>
        </div>
      )}

      {diff.handoverNote && (
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-green-500 rounded-full" />
            交接备注变更
          </h4>
          <div class={`p-3 rounded-xl border ${getTypeColor(diff.handoverNote.type)}`}>
            <div class="flex items-start gap-2">
              <span class="flex-shrink-0">{getTypeIcon(diff.handoverNote.type)}</span>
              <div class="flex-1 min-w-0 space-y-3">
                {diff.handoverNote.oldValue && (
                  <div>
                    <p class="text-xs text-gray-500 mb-1">原内容：</p>
                    <div class="p-2 bg-wine-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap line-through opacity-70">
                      {diff.handoverNote.oldValue}
                    </div>
                  </div>
                )}
                {diff.handoverNote.newValue && (
                  <div>
                    <p class="text-xs text-gray-500 mb-1">新内容：</p>
                    <div class="p-2 bg-green-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                      {diff.handoverNote.newValue}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
