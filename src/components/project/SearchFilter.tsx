import { component$, $ } from '@builder.io/qwik';
import { HANDOVER_STATUS_LABELS, type HandoverStatus } from '~/types/project';

interface SearchFilterProps {
  keyword: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  onKeywordChange$: (value: string) => void;
  onStatusChange$: (value: string) => void;
  onDateFromChange$: (value: string) => void;
  onDateToChange$: (value: string) => void;
  onReset$: () => void;
}

export const SearchFilter = component$<SearchFilterProps>((props) => {
  const statusOptions = [
    { value: 'all', label: '全部状态' },
    ...Object.entries(HANDOVER_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <div class="card-base mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm text-gray-600 mb-1.5">搜索</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={props.keyword}
              onInput$={(e) => props.onKeywordChange$((e.target as HTMLInputElement).value)}
              placeholder="搜索项目编号、新人姓名、摄影师..."
              class="input-base pl-10"
            />
          </div>
        </div>

        <div class="min-w-[150px]">
          <label class="block text-sm text-gray-600 mb-1.5">状态筛选</label>
          <select
            value={props.status}
            onChange$={(e) => props.onStatusChange$((e.target as HTMLSelectElement).value)}
            class="input-base appearance-none bg-white cursor-pointer"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div class="min-w-[140px]">
          <label class="block text-sm text-gray-600 mb-1.5">开始日期</label>
          <input
            type="date"
            value={props.dateFrom}
            onChange$={(e) => props.onDateFromChange$((e.target as HTMLInputElement).value)}
            class="input-base"
          />
        </div>

        <div class="min-w-[140px]">
          <label class="block text-sm text-gray-600 mb-1.5">结束日期</label>
          <input
            type="date"
            value={props.dateTo}
            onChange$={(e) => props.onDateToChange$((e.target as HTMLInputElement).value)}
            class="input-base"
          />
        </div>

        <button
          onClick$={props.onReset$}
          class="px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          重置筛选
        </button>
      </div>
    </div>
  );
});
