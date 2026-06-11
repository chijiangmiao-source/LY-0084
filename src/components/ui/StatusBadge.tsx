import { component$ } from '@builder.io/qwik';
import {
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUS_COLORS,
  type HandoverStatus,
} from '~/types/project';

interface StatusBadgeProps {
  status: HandoverStatus;
}

export const StatusBadge = component$<StatusBadgeProps>(({ status }) => {
  const label = HANDOVER_STATUS_LABELS[status];
  const colorClass = HANDOVER_STATUS_COLORS[status];

  return (
    <span class={`badge-base ${colorClass}`}>
      {label}
    </span>
  );
});
