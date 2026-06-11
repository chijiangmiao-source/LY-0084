import { component$ } from '@builder.io/qwik';
import type { StatusLog } from '~/types/project';
import { HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS } from '~/types/project';
import { formatDateTime } from '~/utils/dateUtils';

interface StatusTimelineProps {
  logs: StatusLog[];
}

export const StatusTimeline = component$<StatusTimelineProps>(({ logs }) => {
  if (logs.length === 0) {
    return (
      <div class="text-center py-6 text-gray-400">
        <p class="text-2xl mb-1">📝</p>
        <p class="text-sm">暂无状态变更记录</p>
      </div>
    );
  }

  return (
    <div class="space-y-4">
      {logs.map((log, index) => {
        const isLast = index === logs.length - 1;
        const toColorClass = HANDOVER_STATUS_COLORS[log.toStatus] || 'bg-gray-100 text-gray-600';

        return (
          <div key={log.id} class="relative flex gap-4">
            <div class="flex flex-col items-center">
              <div class="w-3 h-3 rounded-full bg-champagne-500 z-10" />
              {!isLast && <div class="w-0.5 flex-1 bg-champagne-200" />}
            </div>

            <div class="flex-1 pb-4">
              <div class="flex items-center gap-2 mb-1">
                {log.fromStatus && (
                  <>
                    <span class={`badge-base ${HANDOVER_STATUS_COLORS[log.fromStatus]}`}>
                      {HANDOVER_STATUS_LABELS[log.fromStatus]}
                    </span>
                    <span class="text-gray-400">→</span>
                  </>
                )}
                <span class={`badge-base ${toColorClass}`}>
                  {HANDOVER_STATUS_LABELS[log.toStatus]}
                </span>
              </div>
              <p class="text-sm text-gray-500">
                {log.remark} · {formatDateTime(log.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
});
