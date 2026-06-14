import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import type {
  HandoverTemplate,
  DeviceType,
  MissingSeverity,
  TemplateStorageCard,
  TemplateBackupLocation,
  TemplateMissingItem,
} from '~/types/project';
import {
  DEVICE_TYPE_LABELS,
  DEVICE_TYPE_ICONS,
  MISSING_SEVERITY_LABELS,
  BACKUP_LOCATION_TYPE_LABELS,
  BACKUP_LOCATION_TYPE_ICONS,
} from '~/types/project';
import { templateStorage, projectStorage, templateVersionStorage } from '~/utils/storage';
import { formatDate, formatDateTime } from '~/utils/dateUtils';

const TEMPLATE_ICONS = ['💒', '📸', '🚁', '🎥', '🎤', '💍', '👰', '🤵', '💾', '✨'];

export default component$(() => {
  const templates = useSignal<HandoverTemplate[]>([]);
  const templateProjectCounts = useSignal<Record<string, number>>({});
  const showForm = useSignal(false);
  const editingTemplate = useSignal<HandoverTemplate | null>(null);

  const formName = useSignal('');
  const formDescription = useSignal('');
  const formIcon = useSignal('💒');
  const formIsDefault = useSignal(false);
  const formHandoverNote = useSignal('');
  const formCards = useSignal<TemplateStorageCard[]>([]);
  const formBackups = useSignal<TemplateBackupLocation[]>([]);
  const formMissings = useSignal<TemplateMissingItem[]>([]);
  const changeLog = useSignal('');
  const showVersionHistory = useSignal(false);
  const historyTemplateId = useSignal('');

  const loadTemplates = $(() => {
    templateStorage.initDefaults();
    templates.value = templateStorage.getAll();
    const allProjects = projectStorage.getAll();
    const counts: Record<string, number> = {};
    for (const tpl of templates.value) {
      counts[tpl.id] = allProjects.filter((p) => p.templateId === tpl.id).length;
    }
    templateProjectCounts.value = counts;
  });

  useVisibleTask$(() => {
    loadTemplates();
  });

  const resetForm = $(() => {
    formName.value = '';
    formDescription.value = '';
    formIcon.value = '💒';
    formIsDefault.value = false;
    formHandoverNote.value = '';
    formCards.value = [];
    formBackups.value = [];
    formMissings.value = [];
    changeLog.value = '';
    editingTemplate.value = null;
  });

  const openNewForm = $(() => {
    resetForm();
    showForm.value = true;
  });

  const openEditForm = $((template: HandoverTemplate) => {
    formName.value = template.name;
    formDescription.value = template.description;
    formIcon.value = template.icon;
    formIsDefault.value = template.isDefault;
    formHandoverNote.value = template.handoverNote;
    formCards.value = JSON.parse(JSON.stringify(template.storageCards));
    formBackups.value = JSON.parse(JSON.stringify(template.backupLocations));
    formMissings.value = JSON.parse(JSON.stringify(template.missingItems));
    changeLog.value = '';
    editingTemplate.value = template;
    showForm.value = true;
  });

  const openVersionHistory = $((templateId: string) => {
    historyTemplateId.value = templateId;
    showVersionHistory.value = true;
  });

  const closeForm = $(() => {
    showForm.value = false;
    resetForm();
  });

  const addCard = $(() => {
    formCards.value = [
      ...formCards.value,
      { cardLabel: '', deviceType: 'camera', deviceName: '', capacity: '128GB' },
    ];
  });

  const updateCard = $(
    (index: number, field: keyof TemplateStorageCard, value: string) => {
      const updated = [...formCards.value];
      const item = { ...updated[index], [field]: value };
      updated[index] = item;
      formCards.value = updated;
    }
  );

  const removeCard = $((index: number) => {
    formCards.value = formCards.value.filter((_, i) => i !== index);
  });

  const addBackup = $(() => {
    formBackups.value = [
      ...formBackups.value,
      { location: '', locationType: 'other' },
    ];
  });

  const updateBackup = $(
    (index: number, field: keyof TemplateBackupLocation, value: string) => {
      const updated = [...formBackups.value];
      const item = { ...updated[index], [field]: value };
      updated[index] = item;
      formBackups.value = updated;
    }
  );

  const removeBackup = $((index: number) => {
    formBackups.value = formBackups.value.filter((_, i) => i !== index);
  });

  const addMissing = $(() => {
    formMissings.value = [
      ...formMissings.value,
      { description: '', severity: 'medium' },
    ];
  });

  const updateMissing = $(
    (index: number, field: keyof TemplateMissingItem, value: string) => {
      const updated = [...formMissings.value];
      const item = { ...updated[index], [field]: value };
      updated[index] = item;
      formMissings.value = updated;
    }
  );

  const removeMissing = $((index: number) => {
    formMissings.value = formMissings.value.filter((_, i) => i !== index);
  });

  const saveForm = $(() => {
    if (!formName.value.trim()) {
      alert('请输入模板名称');
      return;
    }

    const templateData = {
      name: formName.value.trim(),
      description: formDescription.value.trim(),
      icon: formIcon.value,
      isDefault: formIsDefault.value,
      handoverNote: formHandoverNote.value,
      storageCards: formCards.value.filter((c) => c.cardLabel.trim()),
      backupLocations: formBackups.value.filter((b) => b.location.trim()),
      missingItems: formMissings.value.filter((m) => m.description.trim()),
    };

    if (editingTemplate.value) {
      const linkedCount = templateProjectCounts.value[editingTemplate.value.id] || 0;
      if (linkedCount > 0) {
        const confirmed = confirm(
          `即将保存对模板的修改。\n\n⚠️ 该模板当前关联了 ${linkedCount} 个项目。\n\n保存后，以下内容将自动同步至所有关联项目：\n• 未回收的存储卡将按新模板重新生成\n• 未完成的备份位置将按新模板重新生成\n• 未解决的缺失核对项将按新模板重新生成\n• 交接备注将被新模板覆盖\n\n已完成/已回收/已解决的内容不会被修改。\n\n是否继续？`
        );
        if (!confirmed) return;
      }
      templateStorage.update(
        editingTemplate.value.id,
        templateData,
        true,
        changeLog.value.trim() || undefined
      );
    } else {
      templateStorage.create(templateData);
    }

    loadTemplates();
    closeForm();
  });

  const deleteTemplate = $((id: string, name: string) => {
    const linkedCount = templateProjectCounts.value[id] || 0;
    const confirmMsg = linkedCount > 0
      ? `确定要删除模板「${name}」吗？\n\n⚠️ 该模板当前关联了 ${linkedCount} 个项目，删除后这些项目将自动解除与模板的关联（不会删除项目本身）。`
      : `确定要删除模板「${name}」吗？`;
    if (!confirm(confirmMsg)) return;
    templateStorage.delete(id);
    loadTemplates();
  });

  const setDefault = $((id: string) => {
    templateStorage.update(id, { isDefault: true }, false);
    loadTemplates();
  });

  const severityColors: Record<MissingSeverity, string> = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-wine-100 text-wine-700',
  };

  return (
    <div class="min-h-screen">
      <header class="bg-white/80 backdrop-blur-md border-b border-champagne-100 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" class="text-gray-500 hover:text-gray-700 transition-colors">
            ← 返回首页
          </Link>
          <div class="w-px h-6 bg-gray-200" />
          <h1 class="text-xl font-display font-bold text-gray-800">交接清单模板管理</h1>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-lg font-display font-semibold text-gray-700">
              模板列表
              <span class="ml-2 text-sm font-normal text-gray-400">
                共 {templates.value.length} 个模板
              </span>
            </h2>
            <p class="text-sm text-gray-500 mt-1">
              预先配置标准化交接清单，新建项目时一键套用
            </p>
          </div>
          <button onClick$={openNewForm} class="btn-primary flex items-center gap-2">
            <span>+</span>
            <span>新建模板</span>
          </button>
        </div>

        {templates.value.length === 0 ? (
          <div class="card-base text-center py-16">
            <div class="text-6xl mb-4">📋</div>
            <p class="text-gray-500 mb-4">还没有任何交接清单模板</p>
            <button onClick$={openNewForm} class="btn-primary inline-flex items-center gap-2">
              <span>+</span>
              <span>创建第一个模板</span>
            </button>
          </div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.value.map((template) => (
              <div
                key={template.id}
                class={`card-base hover:shadow-card transition-shadow ${
                  template.isDefault ? 'ring-2 ring-champagne-400' : ''
                }`}
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-champagne-100 to-champagne-200 rounded-xl flex items-center justify-center text-2xl">
                      {template.icon}
                    </div>
                    <div>
                      <h3 class="font-display font-semibold text-gray-800 flex items-center gap-2">
                        {template.name}
                        {template.isDefault && (
                          <span class="text-xs bg-champagne-100 text-champagne-700 px-2 py-0.5 rounded-full">
                            默认
                          </span>
                        )}
                        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          v{template.currentVersion}
                        </span>
                      </h3>
                      <p class="text-xs text-gray-400 mt-0.5">
                        更新于 {formatDate(template.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <p class="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

                <div class="space-y-2 mb-4">
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span>💾</span>
                    <span>存储卡：{template.storageCards.length} 张</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span>🖥️</span>
                    <span>备份位置：{template.backupLocations.length} 个</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span>✅</span>
                    <span>核对项：{template.missingItems.length} 项</span>
                  </div>
                  <div class={`flex items-center gap-2 text-xs ${
                    (templateProjectCounts.value[template.id] || 0) > 0
                      ? 'text-champagne-600 font-medium'
                      : 'text-gray-400'
                  }`}>
                    <span>📁</span>
                    <span>
                      关联项目：{(templateProjectCounts.value[template.id] || 0)} 个
                      {(templateProjectCounts.value[template.id] || 0) > 0 && '（修改将同步）'}
                    </span>
                  </div>
                </div>

                {template.storageCards.length > 0 && (
                  <div class="mb-4 pt-3 border-t border-gray-100">
                    <p class="text-xs text-gray-400 mb-2">存储卡预览：</p>
                    <div class="flex flex-wrap gap-1">
                      {template.storageCards.slice(0, 4).map((card, idx) => (
                        <span
                          key={idx}
                          class="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100"
                        >
                          {DEVICE_TYPE_ICONS[card.deviceType]} {card.cardLabel}
                        </span>
                      ))}
                      {template.storageCards.length > 4 && (
                        <span class="text-xs text-gray-400 px-2 py-1">
                          +{template.storageCards.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div class="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick$={() => openVersionHistory(template.id)}
                    class="flex-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition-colors"
                  >
                    📜 版本
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick$={() => setDefault(template.id)}
                      class="flex-1 text-xs text-champagne-600 hover:text-champagne-700 bg-champagne-50 hover:bg-champagne-100 rounded-lg py-2 transition-colors"
                    >
                      默认
                    </button>
                  )}
                  <button
                    onClick$={() => openEditForm(template)}
                    class="flex-1 text-xs text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg py-2 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick$={() => deleteTemplate(template.id, template.name)}
                    class="flex-1 text-xs text-wine-600 hover:text-wine-700 bg-wine-50 hover:bg-wine-100 rounded-lg py-2 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm.value && (
        <div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center py-8 overflow-y-auto">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-display font-semibold text-gray-800">
                {editingTemplate.value ? '编辑模板' : '新建模板'}
              </h2>
              <button
                onClick$={closeForm}
                class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div class="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">
                    模板名称 <span class="text-wine-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName.value}
                    onInput$={(e) => (formName.value = (e.target as HTMLInputElement).value)}
                    placeholder="如：常规婚礼、双机位婚礼"
                    class="input-base"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">模板图标</label>
                  <div class="flex flex-wrap gap-2">
                    {TEMPLATE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick$={() => (formIcon.value = icon)}
                        class={`w-10 h-10 rounded-lg text-xl transition-all ${
                          formIcon.value === icon
                            ? 'bg-champagne-100 ring-2 ring-champagne-400'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">模板描述</label>
                <input
                  type="text"
                  value={formDescription.value}
                  onInput$={(e) => (formDescription.value = (e.target as HTMLInputElement).value)}
                  placeholder="简要描述这个模板适用的场景"
                  class="input-base"
                />
              </div>

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formIsDefault.value}
                  onChange$={(e) => (formIsDefault.value = (e.target as HTMLInputElement).checked)}
                  class="w-4 h-4 text-champagne-600 rounded"
                />
                <label for="isDefault" class="text-sm text-gray-700">
                  设为默认模板（新建项目时自动选中）
                </label>
              </div>

              <div class="pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-display font-semibold text-gray-700 flex items-center gap-2">
                    <span class="w-1 h-5 bg-champagne-500 rounded-full" />
                    存储卡检查项
                    <span class="text-sm font-normal text-gray-400">
                      ({formCards.value.length} 张)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick$={addCard}
                    class="text-sm text-champagne-600 hover:text-champagne-700"
                  >
                    + 添加存储卡
                  </button>
                </div>

                {formCards.value.length === 0 ? (
                  <div class="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                    <p class="text-sm">暂无存储卡配置</p>
                  </div>
                ) : (
                  <div class="space-y-3">
                    {formCards.value.map((card, index) => (
                      <div
                        key={index}
                        class="p-4 bg-champagne-50/50 rounded-xl border border-champagne-100"
                      >
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">标签 *</label>
                            <input
                              type="text"
                              value={card.cardLabel}
                              onInput$={(e) =>
                                updateCard(index, 'cardLabel', (e.target as HTMLInputElement).value)
                              }
                              placeholder="如：A卡"
                              class="input-base text-sm py-2"
                            />
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">设备类型</label>
                            <select
                              value={card.deviceType}
                              onChange$={(e) =>
                                updateCard(index, 'deviceType', (e.target as HTMLSelectElement).value)
                              }
                              class="input-base text-sm py-2 appearance-none bg-white cursor-pointer"
                            >
                              {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((type) => (
                                <option key={type} value={type}>
                                  {`${DEVICE_TYPE_ICONS[type]} ${DEVICE_TYPE_LABELS[type]}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">设备名称</label>
                            <input
                              type="text"
                              value={card.deviceName}
                              onInput$={(e) =>
                                updateCard(index, 'deviceName', (e.target as HTMLInputElement).value)
                              }
                              placeholder="如：主相机"
                              class="input-base text-sm py-2"
                            />
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">容量</label>
                            <input
                              type="text"
                              value={card.capacity}
                              onInput$={(e) =>
                                updateCard(index, 'capacity', (e.target as HTMLInputElement).value)
                              }
                              placeholder="如：128GB"
                              class="input-base text-sm py-2"
                            />
                          </div>
                        </div>
                        <div class="flex justify-end">
                          <button
                            type="button"
                            onClick$={() => removeCard(index)}
                            class="text-xs text-wine-500 hover:text-wine-600"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div class="pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-display font-semibold text-gray-700 flex items-center gap-2">
                    <span class="w-1 h-5 bg-champagne-500 rounded-full" />
                    备份位置建议
                    <span class="text-sm font-normal text-gray-400">
                      ({formBackups.value.length} 个)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick$={addBackup}
                    class="text-sm text-champagne-600 hover:text-champagne-700"
                  >
                    + 添加备份位置
                  </button>
                </div>

                {formBackups.value.length === 0 ? (
                  <div class="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                    <p class="text-sm">暂无备份位置配置</p>
                  </div>
                ) : (
                  <div class="space-y-3">
                    {formBackups.value.map((backup, index) => (
                      <div
                        key={index}
                        class="p-4 bg-champagne-50/50 rounded-xl border border-champagne-100"
                      >
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">备份位置 *</label>
                            <input
                              type="text"
                              value={backup.location}
                              onInput$={(e) =>
                                updateBackup(index, 'location', (e.target as HTMLInputElement).value)
                              }
                              placeholder="如：NAS存储"
                              class="input-base text-sm py-2"
                            />
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">存储类型</label>
                            <select
                              value={backup.locationType}
                              onChange$={(e) =>
                                updateBackup(index, 'locationType', (e.target as HTMLSelectElement).value)
                              }
                              class="input-base text-sm py-2 appearance-none bg-white cursor-pointer"
                            >
                              {Object.keys(BACKUP_LOCATION_TYPE_LABELS).map((type) => (
                                <option key={type} value={type}>
                                  {`${BACKUP_LOCATION_TYPE_ICONS[type]} ${BACKUP_LOCATION_TYPE_LABELS[type]}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div class="flex justify-end">
                          <button
                            type="button"
                            onClick$={() => removeBackup(index)}
                            class="text-xs text-wine-500 hover:text-wine-600"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div class="pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-display font-semibold text-gray-700 flex items-center gap-2">
                    <span class="w-1 h-5 bg-wine-500 rounded-full" />
                    缺失核对项
                    <span class="text-sm font-normal text-gray-400">
                      ({formMissings.value.length} 项)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick$={addMissing}
                    class="text-sm text-champagne-600 hover:text-champagne-700"
                  >
                    + 添加核对项
                  </button>
                </div>

                {formMissings.value.length === 0 ? (
                  <div class="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                    <p class="text-sm">暂无核对项配置</p>
                  </div>
                ) : (
                  <div class="space-y-3">
                    {formMissings.value.map((missing, index) => (
                      <div
                        key={index}
                        class="p-4 bg-wine-50/30 rounded-xl border border-wine-100"
                      >
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                          <div class="md:col-span-3">
                            <label class="block text-xs text-gray-500 mb-1">核对项描述 *</label>
                            <input
                              type="text"
                              value={missing.description}
                              onInput$={(e) =>
                                updateMissing(
                                  index,
                                  'description',
                                  (e.target as HTMLInputElement).value
                                )
                              }
                              placeholder="如：核对迎亲环节素材是否完整"
                              class="input-base text-sm py-2"
                            />
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 mb-1">严重程度</label>
                            <div class="flex gap-1">
                              {(['low', 'medium', 'high'] as MissingSeverity[]).map((sev) => (
                                <button
                                  key={sev}
                                  type="button"
                                  onClick$={() => updateMissing(index, 'severity', sev)}
                                  class={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                                    missing.severity === sev
                                      ? severityColors[sev]
                                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                  }`}
                                >
                                  {MISSING_SEVERITY_LABELS[sev]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div class="flex justify-end">
                          <button
                            type="button"
                            onClick$={() => removeMissing(index)}
                            class="text-xs text-wine-500 hover:text-wine-600"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div class="pt-4 border-t border-gray-100">
                <h3 class="font-display font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <span class="w-1 h-5 bg-champagne-500 rounded-full" />
                  交接备注草稿
                </h3>
                <textarea
                  value={formHandoverNote.value}
                  onInput$={(e) =>
                    (formHandoverNote.value = (e.target as HTMLTextAreaElement).value)
                  }
                  placeholder="填写默认交接备注内容，创建项目时会自动填充..."
                  rows={4}
                  class="input-base resize-none text-sm"
                />
              </div>

              {editingTemplate.value && (
                <div class="mt-6 pt-4 border-t border-gray-100">
                  <label class="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    📝 版本变更说明
                    <span class="text-xs font-normal text-gray-400">（可选，将记录在版本历史中）</span>
                  </label>
                  <textarea
                    value={changeLog.value}
                    onInput$={(e) => (changeLog.value = (e.target as HTMLTextAreaElement).value)}
                    placeholder="例如：新增第二机位存储卡、调整备份位置顺序、更新核对项..."
                    rows={2}
                    class="input-base resize-none text-sm"
                  />
                </div>
              )}
            </div>

            <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick$={closeForm}
                class="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick$={saveForm}
                class="btn-primary"
              >
                {editingTemplate.value ? '保存修改' : '创建模板'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionHistory.value && historyTemplateId.value && (
        <div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center py-8 overflow-y-auto">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-display font-semibold text-gray-800 flex items-center gap-2">
                📜 模板版本历史
              </h2>
              <button
                onClick$={() => (showVersionHistory.value = false)}
                class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div class="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {(() => {
                const versions = templateVersionStorage.getByTemplateId(historyTemplateId.value).sort(
                  (a, b) => b.version - a.version
                );
                if (versions.length === 0) {
                  return (
                    <div class="text-center py-12 text-gray-400">
                      <p class="text-4xl mb-3">📭</p>
                      <p class="text-sm">暂无版本历史记录</p>
                    </div>
                  );
                }
                return (
                  <div class="space-y-4">
                    {versions.map((version, idx) => (
                      <div
                        key={version.id}
                        class={`p-4 rounded-xl border ${
                          idx === 0 ? 'bg-champagne-50 border-champagne-200' : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div class="flex items-start justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <span class="text-lg font-bold text-champagne-600">v{version.version}</span>
                            {idx === 0 && (
                              <span class="text-xs bg-champagne-200 text-champagne-700 px-2 py-0.5 rounded-full">
                                最新版本
                              </span>
                            )}
                          </div>
                          <span class="text-xs text-gray-400">
                            {formatDateTime(version.createdAt)}
                          </span>
                        </div>
                        {version.changeLog ? (
                          <p class="text-sm text-gray-700 mb-2">{version.changeLog}</p>
                        ) : (
                          <p class="text-sm text-gray-400 italic mb-2">未填写变更说明</p>
                        )}
                        <div class="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>💾 存储卡 {version.storageCards.length} 张</span>
                          <span>🖥️ 备份 {version.backupLocations.length} 个</span>
                          <span>✅ 核对项 {version.missingItems.length} 项</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
