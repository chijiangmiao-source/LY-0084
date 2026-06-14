import { component$, useSignal, $ } from '@builder.io/qwik';
import type { ActivityLog, ActivityType } from '~/types/project';
import { ACTIVITY_TYPE_LABELS, HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS } from '~/types/project';
import { formatDateTime, getRelativeTime } from '~/utils/dateUtils';

interface StatusTimelineProps {
  logs: ActivityLog[];
}

type FilterType = 'all' | ActivityType;

const FILTER_GROUPS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'status_change', label: '状态变更', icon: '🔄' },
  { key: 'card_add', label: '存储卡', icon: '💾' },
  { key: 'backup_add', label: '备份', icon: '💽' },
  { key: 'missing_add', label: '缺失', icon: '⚠️' },
  { key: 'handover_note_update', label: '备注', icon: '📝' },
];

export const StatusTimeline = component$<StatusTimelineProps>(({ logs }) => {
  const filter = useSignal<FilterType>('all');
  const expandedId = useSignal<string | null>(null);

  const filteredLogs = filter.value === 'all'
    ? logs
    : logs.filter((l) => {
        if (filter.value === 'card_add') {
          return ['card_add', 'card_recover', 'card_unrecover', 'card_delete'].includes(l.type);
        }
        if (filter.value === 'backup_add') {
          return ['backup_add', 'backup_complete', 'backup_uncomplete', 'backup_delete', 'backup_verify'].includes(l.type);
        }
        if (filter.value === 'missing_add') {
          return ['missing_add', 'missing_resolve', 'missing_unresolve', 'missing_delete'].includes(l.type);
        }
        return l.type === filter.value;
      });

  const toggleExpand = $((id: string) => {
    expandedId.value = expandedId.value === id ? null : id;
  });

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'status_change':
        return '🔄';
      case 'card_add':
        return '➕';
      case 'card_recover':
        return '✅';
      case 'card_unrecover':
        return '↩️';
      case 'card_delete':
        return '🗑️';
      case 'backup_add':
        return '➕';
      case 'backup_complete':
        return '✅';
      case 'backup_uncomplete':
        return '↩️';
      case 'backup_delete':
        return '🗑️';
      case 'backup_verify':
        return '🔍';
      case 'missing_add':
        return '⚠️';
      case 'missing_resolve':
        return '✅';
      case 'missing_unresolve':
        return '↩️';
      case 'missing_delete':
        return '🗑️';
      case 'handover_note_update':
        return '📝';
      case 'project_edit':
        return '✏️';
      default:
        return '📋';
    }
  };

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'status_change':
        return 'bg-purple-500';
      case 'card_add':
      case 'backup_add':
      case 'missing_add':
        return 'bg-blue-500';
      case 'card_recover':
      case 'backup_complete':
      case 'missing_resolve':
      case 'backup_verify':
        return 'bg-green-500';
      case 'card_unrecover':
      case 'backup_uncomplete':
      case 'missing_unresolve':
        return 'bg-yellow-500';
      case 'card_delete':
      case 'backup_delete':
      case 'missing_delete':
        return 'bg-wine-500';
      case 'handover_note_update':
      case 'project_edit':
        return 'bg-champagne-500';
      default:
        return 'bg-gray-500';
    }
  };

  const hasDetails = (log: ActivityLog): boolean => {
    if (!log.details) return false;
    const keys = Object.keys(log.details).filter(
      (k) => !['cardId', 'backupId', 'missingId'].includes(k)
    );
    return keys.length > 0;
  };

  const formatDetailValue = (key: string, value: unknown): string => {
    if (key === 'fromStatus' || key === 'toStatus') {
      return HANDOVER_STATUS_LABELS[value as keyof typeof HANDOVER_STATUS_LABELS] || String(value);
    }
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    return String(value);
  };

  const getDetailLabel = (key: string): string => {
    const labels: Record<string, string> = {
      cardLabel: '卡片标签',
      deviceType: '设备类型',
      capacity: '容量',
      location: '备份位置',
      locationType: '存储类型',
      isRecovered: '是否回收',
      isCompleted: '是否完成',
      verifyStatus: '验证状态',
      description: '描述',
      severity: '严重程度',
      isResolved: '是否解决',
      resolution: '解决方案',
      fromStatus: '原状态',
      toStatus: '新状态',
      remark: '备注',
      oldNote: '原备注',
      newNote: '新备注',
      fileCount: '文件数',
      totalSize: '总大小',
      deviceName: '设备名称',
    };
    return labels[key] || key;
  };

  if (logs.length === 0) {
    return (
      <div class="text-center py-6 text-gray-400">
        <p class="text-2xl mb-1">📝</p>
        <p class="text-sm">暂无操作记录</p>
      </div>
    );
  }

  const showFilters = logs.length > 5;

  return (
    <div class="space-y-4">
      {showFilters && (
        <div class="flex flex-wrap gap-2 pb-2 border-b border-gray-100 mb-4">
          {FILTER_GROUPS.map((f) => (
            <button
              key={f.key}
              onClick$={() => (filter.value = f.key)}
              class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                filter.value === f.key
                  ? 'bg-champagne-100 text-champagne-700'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      )}

      {filteredLogs.length === 0 ? (
        <div class="text-center py-8 text-gray-400">
          <p class="text-2xl mb-1">🔍</p>
          <p class="text-sm">没有符合条件的记录</p>
        </div>
      ) : (
        <div class="space-y-1">
          {filteredLogs.map((log, index) => {
            const isLast = index === filteredLogs.length - 1;
            const dotColor = getActivityColor(log.type);
            const icon = getActivityIcon(log.type);
            const isExpanded = expandedId.value === log.id;
            const hasDetail = hasDetails(log);

            return (
              <div
                key={log.id}
                class={`relative flex gap-4 cursor-pointer transition-all duration-200 ${
                  hasDetail ? 'hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg' : ''
                }`}
                onClick$={() => hasDetail && toggleExpand(log.id)}
              >
                <div class="flex flex-col items-center flex-shrink-0">
                  <div
                    class={`w-8 h-8 rounded-full ${dotColor} z-10 flex items-center justify-center text-sm shadow-sm`}
                  >
                    <span class="text-white text-xs">{icon}</span>
                  </div>
                  {!isLast && <div class="w-0.5 flex-1 bg-gray-200 my-1" />}
                </div>

                <div class="flex-1 pb-4 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="text-sm font-medium text-gray-700">
                      {ACTIVITY_TYPE_LABELS[log.type as keyof typeof ACTIVITY_TYPE_LABELS] || log.type}
                    </span>
                    {log.type === 'status_change' && log.details && (
                      <div class="flex items-center gap-1 flex-wrap">
                        {typeof (log.details as Record<string, unknown>).fromStatus === 'string' && (
                          <>
                            <span
                              class={`badge-base text-xs ${
                                HANDOVER_STATUS_COLORS[
                                  (log.details as Record<string, string>).fromStatus as keyof typeof HANDOVER_STATUS_COLORS
                                ]
                              }`}
                            >
                              {
                                HANDOVER_STATUS_LABELS[
                                  (log.details as Record<string, string>).fromStatus as keyof typeof HANDOVER_STATUS_LABELS
                                ]
                              }
                            </span>
                            <span class="text-gray-400 text-xs">→</span>
                          </>
                        )}
                        <span
                          class={`badge-base text-xs ${
                            HANDOVER_STATUS_COLORS[
                              (log.details as Record<string, string>).toStatus as keyof typeof HANDOVER_STATUS_COLORS
                            ]
                          }`}
                        >
                          {
                            HANDOVER_STATUS_LABELS[
                              (log.details as Record<string, string>).toStatus as keyof typeof HANDOVER_STATUS_LABELS
                            ]
                          }
                        </span>
                      </div>
                    )}
                    {hasDetail && (
                      <span class="text-xs text-gray-400">
                        {isExpanded ? '收起 ▲' : '展开 ▼'}
                      </span>
                    )}
                  </div>
                  <p class="text-sm text-gray-600 line-clamp-2">{log.description}</p>

                  {hasDetail && isExpanded && log.details && (
                    <div class="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                      {Object.entries(log.details)
                        .filter(([key]) => !['cardId', 'backupId', 'missingId'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} class="flex gap-2">
                            <span class="text-gray-400 flex-shrink-0">{getDetailLabel(key)}：</span>
                            <span class="text-gray-600 break-all">
                              {formatDetailValue(key, value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{formatDateTime(log.timestamp)}</span>
                    <span>·</span>
                    <span>{getRelativeTime(log.timestamp)}</span>
                    {log.operator && (
                      <>
                        <span>·</span>
                        <span>{log.operator}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showFilters && filteredLogs.length > 0 && (
        <div class="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
          显示 {filteredLogs.length} / {logs.length} 条记录
        </div>
      )}
    </div>
  );
});
