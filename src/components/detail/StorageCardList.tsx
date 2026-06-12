import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { StorageCard, WeddingProject } from '~/types/project';
import { cardStorage, projectStorage } from '~/utils/storage';
import { formatDateTime } from '~/utils/dateUtils';

interface StorageCardListProps {
  projectId: string;
  project: WeddingProject;
  onUpdate$: () => void;
}

export const StorageCardList = component$<StorageCardListProps>(({ projectId, project, onUpdate$ }) => {
  const cards = useSignal<StorageCard[]>([]);
  const newCardLabel = useSignal('');
  const newCardCapacity = useSignal('64GB');
  const showAddForm = useSignal(false);

  useVisibleTask$(() => {
    cards.value = cardStorage.getByProjectId(projectId);
  });

  const addCard = $(() => {
    if (!newCardLabel.value.trim()) return;

    cardStorage.create({
      projectId,
      cardLabel: newCardLabel.value.trim(),
      capacity: newCardCapacity.value,
      isRecovered: false,
      recoveredAt: null,
    });

    newCardLabel.value = '';
    showAddForm.value = false;
    const updatedCards = cardStorage.getByProjectId(projectId);
    cards.value = updatedCards;

    projectStorage.update(projectId, { cardCount: updatedCards.length });

    onUpdate$();
  });

  const toggleRecovered = $(async (cardId: string, currentValue: boolean) => {
    cardStorage.update(cardId, {
      isRecovered: !currentValue,
      recoveredAt: !currentValue ? new Date().toISOString() : null,
    });
    const updatedCards = cardStorage.getByProjectId(projectId);
    cards.value = updatedCards;

    const recoveredCount = updatedCards.filter((c) =>
      c.id === cardId ? !currentValue : c.isRecovered
    ).length;
    projectStorage.update(projectId, { recoveredCount });
    onUpdate$();
  });

  const deleteCard = $(async (cardId: string) => {
    if (!confirm('确定要删除这张存储卡吗？')) return;
    cardStorage.delete(cardId);
    const remainingCards = cardStorage.getByProjectId(projectId);
    cards.value = remainingCards;

    const recoveredCount = remainingCards.filter((c) => c.isRecovered).length;
    projectStorage.update(projectId, {
      cardCount: remainingCards.length,
      recoveredCount,
    });
    onUpdate$();
  });

  const recoveredCount = cards.value.filter((c) => c.isRecovered).length;
  const allCount = cards.value.length;
  const allRecovered = allCount > 0 && recoveredCount === allCount;

  return (
    <div class="card-base">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-display font-semibold text-gray-700 flex items-center gap-2">
          <span class="w-1 h-6 bg-champagne-500 rounded-full" />
          存储卡核对
          <span class="text-sm font-normal text-gray-400">
            ({recoveredCount} / {allCount} 已回收)
          </span>
        </h3>
        <button
          onClick$={() => (showAddForm.value = !showAddForm.value)}
          class="text-champagne-600 hover:text-champagne-700 text-sm font-medium transition-colors"
        >
          {showAddForm.value ? '取消' : '+ 添加存储卡'}
        </button>
      </div>

      {showAddForm.value && (
        <div class="mb-6 p-4 bg-champagne-50 rounded-xl border border-champagne-100">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm text-gray-600 mb-1">卡片标签</label>
              <input
                type="text"
                value={newCardLabel.value}
                onInput$={(e) => (newCardLabel.value = (e.target as HTMLInputElement).value)}
                placeholder="如：A卡、B卡..."
                class="input-base text-sm"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">容量</label>
              <select
                value={newCardCapacity.value}
                onChange$={(e) => (newCardCapacity.value = (e.target as HTMLSelectElement).value)}
                class="input-base text-sm appearance-none bg-white cursor-pointer"
              >
                <option value="32GB">32GB</option>
                <option value="64GB">64GB</option>
                <option value="128GB">128GB</option>
                <option value="256GB">256GB</option>
                <option value="512GB">512GB</option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                onClick$={addCard}
                class="btn-primary w-full text-sm py-2"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {cards.value.length === 0 ? (
        <div class="text-center py-8 text-gray-400">
          <p class="text-4xl mb-2">💾</p>
          <p>暂无存储卡记录</p>
          <p class="text-sm mt-1">点击上方"添加存储卡"开始登记</p>
        </div>
      ) : (
        <div class="space-y-3">
          {cards.value.map((card) => (
            <div
              key={card.id}
              class={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                card.isRecovered
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div class="flex items-center gap-4">
                <div class={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  card.isRecovered ? 'bg-green-100' : 'bg-gray-200'
                }`}>
                  {card.isRecovered ? '✅' : '💾'}
                </div>
                <div>
                  <p class="font-medium text-gray-800">{card.cardLabel}</p>
                  <p class="text-sm text-gray-500">{card.capacity}</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                {card.isRecovered && card.recoveredAt && (
                  <span class="text-xs text-green-600">
                    {formatDateTime(card.recoveredAt)}
                  </span>
                )}
                <button
                  onClick$={() => toggleRecovered(card.id, card.isRecovered)}
                  class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    card.isRecovered
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {card.isRecovered ? '取消回收' : '标记回收'}
                </button>
                <button
                  onClick$={() => deleteCard(card.id)}
                  class="text-wine-400 hover:text-wine-600 text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {allCount > 0 && (
        <div class="mt-6 pt-4 border-t border-gray-100">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">回收进度</span>
            <span class={allRecovered ? 'text-green-600 font-medium' : 'text-gray-600'}>
              {allRecovered ? '✓ 全部回收完成' : `${recoveredCount} / ${allCount}`}
            </span>
          </div>
          <div class="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class={`h-full rounded-full transition-all duration-500 ${
                allRecovered ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${allCount > 0 ? (recoveredCount / allCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});
