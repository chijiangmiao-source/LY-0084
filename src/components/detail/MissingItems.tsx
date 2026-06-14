import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { MissingItem, MissingSeverity } from '~/types/project';
import { MISSING_SEVERITY_LABELS } from '~/types/project';
import { missingStorage, logActivity } from '~/utils/storage';
import { formatDate } from '~/utils/dateUtils';

interface MissingItemsProps {
  projectId: string;
  onUpdate$: () => void;
}

export const MissingItems = component$<MissingItemsProps>(({ projectId, onUpdate$ }) => {
  const items = useSignal<MissingItem[]>([]);
  const newDescription = useSignal('');
  const newSeverity = useSignal<MissingSeverity>('medium');
  const showAddForm = useSignal(false);

  useVisibleTask$(() => {
    items.value = missingStorage.getByProjectId(projectId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  const addItem = $(() => {
    if (!newDescription.value.trim()) return;

    const newItem = missingStorage.create({
      projectId,
      description: newDescription.value.trim(),
      severity: newSeverity.value,
      isResolved: false,
      resolution: '',
    });

    logActivity(
      projectId,
      'missing_add',
      `添加缺失记录：${newItem.description}（${MISSING_SEVERITY_LABELS[newItem.severity]}）`,
      {
        missingId: newItem.id,
        description: newItem.description,
        severity: newItem.severity,
      }
    );

    newDescription.value = '';
    newSeverity.value = 'medium';
    showAddForm.value = false;
    items.value = missingStorage.getByProjectId(projectId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    onUpdate$();
  });

  const toggleResolved = $((itemId: string, currentValue: boolean, description: string) => {
    missingStorage.update(itemId, {
      isResolved: !currentValue,
    });
    items.value = missingStorage.getByProjectId(projectId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    logActivity(
      projectId,
      !currentValue ? 'missing_resolve' : 'missing_unresolve',
      !currentValue
        ? `标记缺失已解决：${description}`
        : `取消缺失解决状态：${description}`,
      {
        missingId: itemId,
        description,
        isResolved: !currentValue,
      }
    );

    onUpdate$();
  });

  const updateResolution = $((itemId: string, resolution: string) => {
    missingStorage.update(itemId, { resolution });
    items.value = missingStorage.getByProjectId(projectId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    onUpdate$();
  });

  const deleteItem = $((itemId: string, description: string) => {
    if (!confirm('确定要删除这条缺失记录吗？')) return;
    missingStorage.delete(itemId);
    items.value = missingStorage.getByProjectId(projectId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    logActivity(
      projectId,
      'missing_delete',
      `删除缺失记录：${description}`,
      {
        missingId: itemId,
        description,
      }
    );

    onUpdate$();
  });

  const severityColors: Record<MissingSeverity, string> = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-wine-100 text-wine-700',
  };

  const unresolvedCount = items.value.filter((i) => !i.isResolved).length;

  return (
    <div class="card-base">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-display font-semibold text-gray-700 flex items-center gap-2">
          <span class="w-1 h-6 bg-wine-500 rounded-full" />
          缺失记录
          <span class="text-sm font-normal text-gray-400">
            ({unresolvedCount} 项未解决)
          </span>
        </h3>
        <button
          onClick$={() => (showAddForm.value = !showAddForm.value)}
          class="text-champagne-600 hover:text-champagne-700 text-sm font-medium transition-colors"
        >
          {showAddForm.value ? '取消' : '+ 添加记录'}
        </button>
      </div>

      {showAddForm.value && (
        <div class="mb-6 p-4 bg-wine-50 rounded-xl border border-wine-100">
          <div class="space-y-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">缺失描述</label>
              <textarea
                value={newDescription.value}
                onInput$={(e) => (newDescription.value = (e.target as HTMLTextAreaElement).value)}
                placeholder="请描述缺失的素材内容..."
                rows={3}
                class="input-base text-sm resize-none"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">严重程度</label>
              <div class="flex gap-2">
                {(['low', 'medium', 'high'] as MissingSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick$={() => (newSeverity.value = sev)}
                    class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      newSeverity.value === sev
                        ? severityColors[sev]
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {MISSING_SEVERITY_LABELS[sev]}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick$={addItem}
              class="btn-primary w-full text-sm py-2"
            >
              添加记录
            </button>
          </div>
        </div>
      )}

      {items.value.length === 0 ? (
        <div class="text-center py-8 text-gray-400">
          <p class="text-4xl mb-2">✅</p>
          <p>暂无缺失记录</p>
          <p class="text-sm mt-1">所有素材完整，无缺失</p>
        </div>
      ) : (
        <div class="space-y-4">
          {items.value.map((item) => (
            <div
              key={item.id}
              class={`p-4 rounded-xl border transition-all ${
                item.isResolved
                  ? 'bg-gray-50 border-gray-200 opacity-70'
                  : 'bg-white border-gray-200 hover:shadow-card'
              }`}
            >
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <span class={`badge-base ${severityColors[item.severity]}`}>
                    {MISSING_SEVERITY_LABELS[item.severity]}
                  </span>
                  <span class="text-xs text-gray-400">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    onClick$={() => toggleResolved(item.id, item.isResolved, item.description)}
                    class={`text-sm px-3 py-1 rounded-lg transition-colors ${
                      item.isResolved
                        ? 'text-green-600 bg-green-50 hover:bg-green-100'
                        : 'text-gray-500 hover:text-green-600'
                    }`}
                  >
                    {item.isResolved ? '✓ 已解决' : '标记解决'}
                  </button>
                  <button
                    onClick$={() => deleteItem(item.id, item.description)}
                    class="text-wine-400 hover:text-wine-600 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p class={`text-gray-700 ${item.isResolved ? 'line-through' : ''}`}>
                {item.description}
              </p>
              {item.isResolved && (
                <div class="mt-3 pt-3 border-t border-gray-100">
                  <label class="block text-xs text-gray-500 mb-1">解决方案</label>
                  <input
                    type="text"
                    value={item.resolution}
                    onInput$={(e) =>
                      updateResolution(item.id, (e.target as HTMLInputElement).value)
                    }
                    placeholder="描述解决方案..."
                    class="input-base text-sm py-2"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
