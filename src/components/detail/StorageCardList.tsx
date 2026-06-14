import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { StorageCard, WeddingProject, DeviceType } from '~/types/project';
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_ICONS } from '~/types/project';
import { cardStorage, projectStorage, logActivity } from '~/utils/storage';
import { formatDateTime } from '~/utils/dateUtils';
import { calculateAutoStatus } from '~/utils/statistics';
import { HANDOVER_STATUS_LABELS } from '~/types/project';

interface StorageCardListProps {
  projectId: string;
  project: WeddingProject;
  onUpdate$: () => void;
}

export const StorageCardList = component$<StorageCardListProps>(({ projectId, project, onUpdate$ }) => {
  const cards = useSignal<StorageCard[]>([]);
  const newCardLabel = useSignal('');
  const newCardCapacity = useSignal('64GB');
  const newDeviceType = useSignal<DeviceType>('camera');
  const newDeviceName = useSignal('');
  const showAddForm = useSignal(false);
  const selectedDevice = useSignal<DeviceType | 'all'>('all');
  const expandedCardId = useSignal<string | null>(null);
  const editingCardId = useSignal<string | null>(null);
  const editFileCount = useSignal('');
  const editTotalSize = useSignal('');
  const editDeviceName = useSignal('');
  const editCapacity = useSignal('');

  useVisibleTask$(() => {
    cards.value = cardStorage.getByProjectId(projectId);
  });

  const addCard = $(() => {
    if (!newCardLabel.value.trim()) return;

    const newCard = cardStorage.create({
      projectId,
      cardLabel: newCardLabel.value.trim(),
      capacity: newCardCapacity.value,
      deviceType: newDeviceType.value,
      deviceName: newDeviceName.value.trim(),
      isRecovered: false,
      recoveredAt: null,
    });

    logActivity(
      projectId,
      'card_add',
      `添加存储卡 ${newCard.cardLabel}（${DEVICE_TYPE_LABELS[newCard.deviceType]}）`,
      {
        cardId: newCard.id,
        cardLabel: newCard.cardLabel,
        deviceType: newCard.deviceType,
        capacity: newCard.capacity,
        deviceName: newCard.deviceName,
      }
    );

    newCardLabel.value = '';
    newDeviceName.value = '';
    showAddForm.value = false;
    const updatedCards = cardStorage.getByProjectId(projectId);
    cards.value = updatedCards;

    const recoveredCount = updatedCards.filter((c) => c.isRecovered).length;
    const newCardCount = updatedCards.length;
    const autoStatus = calculateAutoStatus(project, newCardCount, recoveredCount, project.backupCount);
    
    const updates: Partial<WeddingProject> = {
      cardCount: newCardCount,
      recoveredCount,
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
          remark: '添加存储卡后自动更新状态',
        }
      );
    }

    projectStorage.update(projectId, updates);

    onUpdate$();
  });

  const toggleRecovered = $(async (cardId: string, currentValue: boolean, cardLabel: string) => {
    cardStorage.update(cardId, {
      isRecovered: !currentValue,
      recoveredAt: !currentValue ? new Date().toISOString() : null,
    });
    const updatedCards = cardStorage.getByProjectId(projectId);
    cards.value = updatedCards;

    const recoveredCount = updatedCards.filter((c) =>
      c.id === cardId ? !currentValue : c.isRecovered
    ).length;
    
    const autoStatus = calculateAutoStatus(project, updatedCards.length, recoveredCount, project.backupCount);
    
    const updates: Partial<WeddingProject> = {
      recoveredCount,
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
          remark: !currentValue ? '回收存储卡后自动更新状态' : '取消回收后自动更新状态',
        }
      );
    }

    projectStorage.update(projectId, updates);

    logActivity(
      projectId,
      !currentValue ? 'card_recover' : 'card_unrecover',
      !currentValue
        ? `标记存储卡 ${cardLabel} 已回收`
        : `取消存储卡 ${cardLabel} 回收状态`,
      {
        cardId,
        cardLabel,
        isRecovered: !currentValue,
      }
    );

    onUpdate$();
  });

  const toggleExpand = $((cardId: string) => {
    expandedCardId.value = expandedCardId.value === cardId ? null : cardId;
  });

  const startEdit = $((card: StorageCard) => {
    editingCardId.value = card.id;
    editFileCount.value = card.fileCount?.toString() || '';
    editTotalSize.value = card.totalSize || '';
    editDeviceName.value = card.deviceName || '';
    editCapacity.value = card.capacity || '';
  });

  const cancelEdit = $(() => {
    editingCardId.value = null;
    editFileCount.value = '';
    editTotalSize.value = '';
    editDeviceName.value = '';
    editCapacity.value = '';
  });

  const saveCardEdit = $((cardId: string, cardLabel: string) => {
    const updates: Partial<StorageCard> = {};
    if (editFileCount.value) {
      updates.fileCount = parseInt(editFileCount.value) || 0;
    }
    if (editTotalSize.value) {
      updates.totalSize = editTotalSize.value.trim();
    }
    if (editDeviceName.value !== undefined) {
      updates.deviceName = editDeviceName.value.trim();
    }
    if (editCapacity.value) {
      updates.capacity = editCapacity.value;
    }

    if (Object.keys(updates).length > 0) {
      cardStorage.update(cardId, updates);
      cards.value = cardStorage.getByProjectId(projectId);

      logActivity(
        projectId,
        'project_edit',
        `更新存储卡 ${cardLabel} 明细信息`,
        {
          cardId,
          cardLabel,
          ...updates,
        }
      );
    }

    cancelEdit();
    onUpdate$();
  });

  const deleteCard = $(async (cardId: string, cardLabel: string) => {
    if (!confirm('确定要删除这张存储卡吗？')) return;
    cardStorage.delete(cardId);
    const remainingCards = cardStorage.getByProjectId(projectId);
    cards.value = remainingCards;

    const newCardCount = remainingCards.length;
    const recoveredCount = remainingCards.filter((c) => c.isRecovered).length;
    
    const autoStatus = calculateAutoStatus(project, newCardCount, recoveredCount, project.backupCount);
    
    const updates: Partial<WeddingProject> = {
      cardCount: newCardCount,
      recoveredCount,
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
          remark: '删除存储卡后自动更新状态',
        }
      );
    }

    projectStorage.update(projectId, updates);

    logActivity(
      projectId,
      'card_delete',
      `删除存储卡 ${cardLabel}`,
      {
        cardId,
        cardLabel,
      }
    );

    onUpdate$();
  });

  const deviceTypes = Object.keys(DEVICE_TYPE_LABELS) as DeviceType[];

  const cardsByDevice = cards.value.reduce((acc, card) => {
    if (!acc[card.deviceType]) {
      acc[card.deviceType] = [];
    }
    acc[card.deviceType].push(card);
    return acc;
  }, {} as Record<DeviceType, StorageCard[]>);

  const filteredCards = selectedDevice.value === 'all'
    ? cards.value
    : cardsByDevice[selectedDevice.value] || [];

  const recoveredCount = cards.value.filter((c) => c.isRecovered).length;
  const allCount = cards.value.length;
  const allRecovered = allCount > 0 && recoveredCount === allCount;

  const getDeviceStats = (type: DeviceType | 'all') => {
    const list = type === 'all' ? cards.value : cardsByDevice[type] || [];
    const recovered = list.filter(c => c.isRecovered).length;
    return { total: list.length, recovered };
  };

  return (
    <div class="card-base">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h3 class="text-lg font-display font-semibold text-gray-700 flex items-center gap-2">
          <span class="w-1 h-6 bg-champagne-500 rounded-full" />
          存储卡明细
          <span class="text-sm font-normal text-gray-400">
            ({recoveredCount} / {allCount} 已回收)
          </span>
        </h3>
        <div class="flex items-center gap-3">
          <button
            onClick$={() => (showAddForm.value = !showAddForm.value)}
            class="text-champagne-600 hover:text-champagne-700 text-sm font-medium transition-colors"
          >
            {showAddForm.value ? '取消' : '+ 添加存储卡'}
          </button>
        </div>
      </div>

      {showAddForm.value && (
        <div class="mb-6 p-4 bg-champagne-50 rounded-xl border border-champagne-100">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm text-gray-600 mb-1">卡片标签 *</label>
              <input
                type="text"
                value={newCardLabel.value}
                onInput$={(e) => (newCardLabel.value = (e.target as HTMLInputElement).value)}
                placeholder="如：A卡、B卡..."
                class="input-base text-sm"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">设备类型</label>
              <select
                value={newDeviceType.value}
                onChange$={(e) => (newDeviceType.value = (e.target as HTMLSelectElement).value as DeviceType)}
                class="input-base text-sm appearance-none bg-white cursor-pointer"
              >
                {deviceTypes.map((type) => (
                  <option key={type} value={type}>
                    {`${DEVICE_TYPE_ICONS[type]} ${DEVICE_TYPE_LABELS[type]}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">设备名称</label>
              <input
                type="text"
                value={newDeviceName.value}
                onInput$={(e) => (newDeviceName.value = (e.target as HTMLInputElement).value)}
                placeholder="如：Sony A7M4"
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
                <option value="1TB">1TB</option>
              </select>
            </div>
          </div>
          <div class="mt-4">
            <button
              onClick$={addCard}
              class="btn-primary text-sm py-2 px-6"
            >
              添加存储卡
            </button>
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
        <div class="flex gap-6">
          <div class="w-48 flex-shrink-0 border-r border-gray-100 pr-4 space-y-1">
            <button
              onClick$={() => (selectedDevice.value = 'all')}
              class={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-between ${
                selectedDevice.value === 'all'
                  ? 'bg-champagne-100 text-champagne-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span class="flex items-center gap-2">
                <span>📋</span>
                <span>全部设备</span>
              </span>
              <span class="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                {getDeviceStats('all').total}
              </span>
            </button>
            {deviceTypes.map((type) => {
              const stats = getDeviceStats(type);
              if (stats.total === 0) return null;
              return (
                <button
                  key={type}
                  onClick$={() => (selectedDevice.value = type)}
                  class={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-between ${
                    selectedDevice.value === type
                      ? 'bg-champagne-100 text-champagne-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span class="flex items-center gap-2">
                    <span>{DEVICE_TYPE_ICONS[type]}</span>
                    <span>{DEVICE_TYPE_LABELS[type]}</span>
                  </span>
                  <span class="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                    {stats.recovered}/{stats.total}
                  </span>
                </button>
              );
            })}
          </div>

          <div class="flex-1 min-w-0">
            <div class="mb-4 flex items-center justify-between">
              <p class="text-sm text-gray-500">
                {selectedDevice.value === 'all'
                  ? `共 ${allCount} 张存储卡`
                  : `${DEVICE_TYPE_LABELS[selectedDevice.value]} 共 ${getDeviceStats(selectedDevice.value).total} 张`}
              </p>
              {selectedDevice.value !== 'all' && (
                <span class="text-xs text-gray-400">
                  点击卡片查看详情
                </span>
              )}
            </div>

            <div class="space-y-3">
              {filteredCards.map((card) => {
                const isExpanded = expandedCardId.value === card.id;
                const isEditing = editingCardId.value === card.id;

                return (
                  <div
                    key={card.id}
                    class={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      card.isRecovered
                        ? 'bg-green-50/50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-champagne-200'
                    }`}
                  >
                    <div
                      class="p-4 cursor-pointer"
                      onClick$={() => toggleExpand(card.id)}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <div class={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                            card.isRecovered ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {card.isRecovered ? '✅' : DEVICE_TYPE_ICONS[card.deviceType]}
                          </div>
                          <div>
                            <div class="flex items-center gap-2">
                              <p class="font-medium text-gray-800">{card.cardLabel}</p>
                              <span class={`badge-base text-xs ${
                                card.deviceType === 'camera' ? 'bg-blue-100 text-blue-600' :
                                card.deviceType === 'drone' ? 'bg-purple-100 text-purple-600' :
                                card.deviceType === 'action_cam' ? 'bg-orange-100 text-orange-600' :
                                card.deviceType === 'audio' ? 'bg-pink-100 text-pink-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {DEVICE_TYPE_LABELS[card.deviceType]}
                              </span>
                            </div>
                            <p class="text-sm text-gray-500 mt-0.5">
                              {card.deviceName || '未命名设备'} · {card.capacity}
                            </p>
                          </div>
                        </div>
                        <div class="flex items-center gap-3">
                          {card.isRecovered && card.recoveredAt && (
                            <span class="text-xs text-green-600 hidden sm:block">
                              {formatDateTime(card.recoveredAt)}
                            </span>
                          )}
                          <span class={`text-lg transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {(card.fileCount || card.totalSize) && !isExpanded && (
                        <div class="mt-2 flex gap-3 text-xs text-gray-500">
                          {card.fileCount && <span>📁 {card.fileCount} 个文件</span>}
                          {card.totalSize && <span>💾 {card.totalSize}</span>}
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div class="px-4 pb-4 border-t border-gray-100 pt-3">
                        {isEditing ? (
                          <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                              <div>
                                <label class="block text-xs text-gray-500 mb-1">设备名称</label>
                                <input
                                  type="text"
                                  value={editDeviceName.value}
                                  onInput$={(e) => (editDeviceName.value = (e.target as HTMLInputElement).value)}
                                  class="input-base text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label class="block text-xs text-gray-500 mb-1">容量</label>
                                <select
                                  value={editCapacity.value}
                                  onChange$={(e) => (editCapacity.value = (e.target as HTMLSelectElement).value)}
                                  class="input-base text-sm py-1.5 appearance-none bg-white"
                                >
                                  <option value="32GB">32GB</option>
                                  <option value="64GB">64GB</option>
                                  <option value="128GB">128GB</option>
                                  <option value="256GB">256GB</option>
                                  <option value="512GB">512GB</option>
                                  <option value="1TB">1TB</option>
                                </select>
                              </div>
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
                                  placeholder="如：64.2GB"
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
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); saveCardEdit(card.id, card.cardLabel); }}
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
                                <p class="text-xs text-gray-500 mb-1">设备类型</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {DEVICE_TYPE_ICONS[card.deviceType]} {DEVICE_TYPE_LABELS[card.deviceType]}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">设备名称</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {card.deviceName || '-'}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">容量</p>
                                <p class="text-sm font-medium text-gray-700">{card.capacity}</p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">文件数量</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {card.fileCount ? `${card.fileCount} 个` : '-'}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">总大小</p>
                                <p class="text-sm font-medium text-gray-700">
                                  {card.totalSize || '-'}
                                </p>
                              </div>
                              <div class="bg-white/60 rounded-lg p-3">
                                <p class="text-xs text-gray-500 mb-1">回收状态</p>
                                <p class={`text-sm font-medium ${
                                  card.isRecovered ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  {card.isRecovered ? '已回收' : '待回收'}
                                </p>
                              </div>
                            </div>
                            {card.recoveredAt && (
                              <p class="text-xs text-gray-400">
                                回收时间：{formatDateTime(card.recoveredAt)}
                              </p>
                            )}
                            <div class="flex gap-2 justify-end">
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); deleteCard(card.id, card.cardLabel); }}
                                class="text-wine-400 hover:text-wine-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
                              >
                                删除
                              </button>
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); startEdit(card); }}
                                class="text-gray-500 hover:text-champagne-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                onClick$={(e: MouseEvent) => { e.stopPropagation(); toggleRecovered(card.id, card.isRecovered, card.cardLabel); }}
                                class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  card.isRecovered
                                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                {card.isRecovered ? '取消回收' : '标记回收'}
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

      {allCount > 0 && (
        <div class="mt-6 pt-4 border-t border-gray-100">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">整体回收进度</span>
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
          <div class="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
            {deviceTypes.map((type) => {
              const count = cardsByDevice[type]?.length || 0;
              if (count === 0) return null;
              return (
                <div key={type} class="flex items-center gap-1">
                  <span>{DEVICE_TYPE_ICONS[type]}</span>
                  <span>{DEVICE_TYPE_LABELS[type]}: {count}张</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
