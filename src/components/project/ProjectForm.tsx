import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import type { HandoverStatus, ProjectFormData, HandoverTemplate } from '~/types/project';
import {
  HANDOVER_STATUS_LABELS,
  DEVICE_TYPE_ICONS,
  BACKUP_LOCATION_TYPE_LABELS,
  BACKUP_LOCATION_TYPE_ICONS,
  MISSING_SEVERITY_LABELS,
} from '~/types/project';
import {
  projectStorage,
  statusLogStorage,
  cardStorage,
  backupStorage,
  logActivity,
  templateStorage,
  applyTemplateToProject,
} from '~/utils/storage';
import { validateProjectForm } from '~/utils/validators';
import { getTodayDateString } from '~/utils/dateUtils';

interface ProjectFormProps {
  mode: 'create' | 'edit';
  initialData?: ProjectFormData & { id?: string; recoveredCount?: number; backupCount?: number };
}

function runValidation(
  values: {
    projectNumber: string;
    coupleName: string;
    weddingDate: string;
    photographer: string;
    videographer: string;
    cardCount: number;
    handoverStatus: HandoverStatus;
    anomalyNote: string;
  },
  options: {
    isEdit: boolean;
    currentId?: string;
    currentRecoveredCount?: number;
    currentBackupCount?: number;
  }
) {
  return validateProjectForm(values, {
    isEdit: options.isEdit,
    currentId: options.currentId,
    currentRecoveredCount: options.currentRecoveredCount,
    currentBackupCount: options.currentBackupCount,
    isNumberExists: (num, excludeId) => projectStorage.isNumberExists(num, excludeId),
  });
}

export const ProjectForm = component$<ProjectFormProps>(({ mode, initialData }) => {
  const navigate = useNavigate();

  const projectNumber = useSignal(initialData?.projectNumber || '');
  const coupleName = useSignal(initialData?.coupleName || '');
  const weddingDate = useSignal(initialData?.weddingDate || getTodayDateString());
  const photographer = useSignal(initialData?.photographer || '');
  const videographer = useSignal(initialData?.videographer || '');
  const cardCount = useSignal(initialData?.cardCount || 0);
  const handoverStatus = useSignal<HandoverStatus>(initialData?.handoverStatus || 'pending');
  const anomalyNote = useSignal(initialData?.anomalyNote || '');

  const templates = useSignal<HandoverTemplate[]>([]);
  const selectedTemplateId = useSignal<string>('');
  const showTemplatePreview = useSignal(false);

  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  useVisibleTask$(() => {
    if (mode === 'create') {
      templateStorage.initDefaults();
      templates.value = templateStorage.getAll();
      const defaultTemplate = templateStorage.getDefault();
      if (defaultTemplate) {
        selectedTemplateId.value = defaultTemplate.id;
      }
    }
  });

  const DISALLOWED_STATUSES: HandoverStatus[] = ['handed_over', 'editing', 'completed'];
  const statusOptions = (Object.entries(HANDOVER_STATUS_LABELS) as [HandoverStatus, string][])
    .filter(([value]) => {
      if (mode === 'edit' && initialData?.handoverStatus === value) {
        return true;
      }
      return !DISALLOWED_STATUSES.includes(value);
    });

  const handleSubmit = $(async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;

    const result = runValidation(
      {
        projectNumber: projectNumber.value,
        coupleName: coupleName.value,
        weddingDate: weddingDate.value,
        photographer: photographer.value,
        videographer: videographer.value,
        cardCount: cardCount.value,
        handoverStatus: handoverStatus.value,
        anomalyNote: anomalyNote.value,
      },
      {
        isEdit: mode === 'edit',
        currentId: initialData?.id,
        currentRecoveredCount: initialData?.recoveredCount,
        currentBackupCount: initialData?.backupCount,
      }
    );
    errors.value = result.errors;
    if (!result.valid) {
      isSubmitting.value = false;
      return;
    }

    try {
      if (mode === 'create') {
        const newProject = projectStorage.create({
          projectNumber: projectNumber.value.trim(),
          coupleName: coupleName.value.trim(),
          weddingDate: weddingDate.value,
          photographer: photographer.value.trim(),
          videographer: videographer.value.trim(),
          cardCount: cardCount.value,
          recoveredCount: 0,
          backupCount: 0,
          handoverStatus: handoverStatus.value,
          anomalyNote: anomalyNote.value.trim(),
          handoverNote: '',
        });

        statusLogStorage.create({
          projectId: newProject.id,
          fromStatus: null,
          toStatus: handoverStatus.value,
          remark: '项目创建',
          timestamp: new Date().toISOString(),
        });

        const appliedTemplate = selectedTemplateId.value
          ? templateStorage.getById(selectedTemplateId.value)
          : null;

        if (appliedTemplate) {
          applyTemplateToProject(selectedTemplateId.value, newProject.id);

          logActivity(
            newProject.id,
            'project_edit',
            `套用模板「${appliedTemplate.name}」创建项目`,
            {
              projectNumber: newProject.projectNumber,
              coupleName: newProject.coupleName,
              weddingDate: newProject.weddingDate,
              photographer: newProject.photographer,
              videographer: newProject.videographer,
              templateId: appliedTemplate.id,
              templateName: appliedTemplate.name,
              storageCardCount: appliedTemplate.storageCards.length,
              backupLocationCount: appliedTemplate.backupLocations.length,
              missingItemCount: appliedTemplate.missingItems.length,
            }
          );
        } else {
          logActivity(
            newProject.id,
            'project_edit',
            '创建新项目',
            {
              projectNumber: newProject.projectNumber,
              coupleName: newProject.coupleName,
              weddingDate: newProject.weddingDate,
              photographer: newProject.photographer,
              videographer: newProject.videographer,
              cardCount: newProject.cardCount,
              handoverStatus: newProject.handoverStatus,
            }
          );
        }

        navigate(`/project/${newProject.id}`);
      } else if (initialData?.id) {
        const existingProject = projectStorage.getById(initialData.id);
        const newCardCount = cardCount.value;
        
        let adjustedRecoveredCount = existingProject?.recoveredCount || 0;
        let adjustedBackupCount = existingProject?.backupCount || 0;
        
        if (existingProject && newCardCount < adjustedRecoveredCount) {
          adjustedRecoveredCount = cardStorage.adjustExcessRecovered(initialData.id, newCardCount);
        }
        if (existingProject && newCardCount < adjustedBackupCount) {
          adjustedBackupCount = backupStorage.adjustExcessCompleted(initialData.id, newCardCount);
        }
        
        const updated = projectStorage.update(initialData.id, {
          projectNumber: projectNumber.value.trim(),
          coupleName: coupleName.value.trim(),
          weddingDate: weddingDate.value,
          photographer: photographer.value.trim(),
          videographer: videographer.value.trim(),
          cardCount: newCardCount,
          recoveredCount: adjustedRecoveredCount,
          backupCount: adjustedBackupCount,
          handoverStatus: handoverStatus.value,
          anomalyNote: anomalyNote.value.trim(),
        });

        if (updated) {
          const changedFields: Record<string, { old: unknown; new: unknown }> = {};
          const newProjectNumber = projectNumber.value.trim();
          const newCoupleName = coupleName.value.trim();
          const newPhotographer = photographer.value.trim();
          const newVideographer = videographer.value.trim();
          const newAnomalyNote = anomalyNote.value.trim();

          if (newProjectNumber !== initialData.projectNumber) {
            changedFields.projectNumber = { old: initialData.projectNumber, new: newProjectNumber };
          }
          if (newCoupleName !== initialData.coupleName) {
            changedFields.coupleName = { old: initialData.coupleName, new: newCoupleName };
          }
          if (weddingDate.value !== initialData.weddingDate) {
            changedFields.weddingDate = { old: initialData.weddingDate, new: weddingDate.value };
          }
          if (newPhotographer !== initialData.photographer) {
            changedFields.photographer = { old: initialData.photographer, new: newPhotographer };
          }
          if (newVideographer !== initialData.videographer) {
            changedFields.videographer = { old: initialData.videographer, new: newVideographer };
          }
          if (newCardCount !== initialData.cardCount) {
            changedFields.cardCount = { old: initialData.cardCount, new: newCardCount };
          }
          if (newAnomalyNote !== initialData.anomalyNote) {
            changedFields.anomalyNote = { old: initialData.anomalyNote, new: newAnomalyNote };
          }

          if (Object.keys(changedFields).length > 0) {
            logActivity(
              initialData.id,
              'project_edit',
              '编辑项目信息',
              changedFields
            );
          }

          if (updated.handoverStatus !== initialData.handoverStatus) {
            statusLogStorage.create({
              projectId: initialData.id,
              fromStatus: initialData.handoverStatus,
              toStatus: handoverStatus.value,
              remark: '状态变更',
              timestamp: new Date().toISOString(),
            });

            logActivity(
              initialData.id,
              'status_change',
              `状态从 ${HANDOVER_STATUS_LABELS[initialData.handoverStatus]} 变更为 ${HANDOVER_STATUS_LABELS[handoverStatus.value]}`,
              {
                fromStatus: initialData.handoverStatus,
                toStatus: handoverStatus.value,
                remark: '编辑项目时变更状态',
              }
            );
          }
        }

        navigate(`/project/${initialData.id}`);
      }
    } catch (error) {
      console.error('提交失败:', error);
      errors.value = { submit: '提交失败，请重试' };
    } finally {
      isSubmitting.value = false;
    }
  });

  const showAnomalyNote = handoverStatus.value === 'anomaly';

  return (
    <div class="min-h-screen">
      <header class="bg-white/80 backdrop-blur-md border-b border-champagne-100 sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" class="text-gray-500 hover:text-gray-700 transition-colors">
            ← 返回列表
          </Link>
          <div class="w-px h-6 bg-gray-200" />
          <h1 class="text-xl font-display font-bold text-gray-800">
            {mode === 'create' ? '新建婚礼项目' : '编辑婚礼项目'}
          </h1>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit$={handleSubmit} class="space-y-6" preventdefault:submit>
          {mode === 'create' && templates.value.length > 0 && (
            <div class="card-base">
              <h2 class="text-lg font-display font-semibold text-gray-700 mb-6 flex items-center gap-2">
                <span class="w-1 h-6 bg-champagne-500 rounded-full" />
                交接清单模板
              </h2>

              <div class="mb-4">
                <p class="text-sm text-gray-500 mb-4">
                  选择一个模板，一键生成标准化的素材卡检查项、备份位置建议、缺失核对项和交接备注草稿。
                  <Link href="/templates" class="text-champagne-600 hover:text-champagne-700 underline ml-1">
                    管理模板 →
                  </Link>
                </p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.value.map((template) => {
                    const isSelected = selectedTemplateId.value === template.id;
                    return (
                      <div
                        key={template.id}
                        onClick$={() => {
                          selectedTemplateId.value = template.id;
                        }}
                        class={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                          isSelected
                            ? 'border-champagne-500 bg-champagne-50/50'
                            : 'border-gray-200 hover:border-champagne-300 bg-white'
                        }`}
                      >
                        <div class="flex items-center gap-3 mb-2">
                          <div
                            class={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                              isSelected ? 'bg-champagne-200' : 'bg-gray-100'
                            }`}
                          >
                            {template.icon}
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                              <p
                                class={`font-medium text-sm truncate ${
                                  isSelected ? 'text-champagne-700' : 'text-gray-800'
                                }`}
                              >
                                {template.name}
                              </p>
                              {template.isDefault && (
                                <span class="text-[10px] bg-champagne-100 text-champagne-700 px-1.5 py-0.5 rounded">
                                  默认
                                </span>
                              )}
                            </div>
                            <p class="text-xs text-gray-400 truncate">{template.description}</p>
                          </div>
                        </div>
                        <div class="flex gap-3 text-[11px] text-gray-500">
                          <span>💾 {template.storageCards.length}卡</span>
                          <span>🖥️ {template.backupLocations.length}备份</span>
                          <span>✅ {template.missingItems.length}项</span>
                        </div>
                        {isSelected && (
                          <button
                            type="button"
                            onClick$={(e) => {
                              e.stopPropagation();
                              showTemplatePreview.value = !showTemplatePreview.value;
                            }}
                            class="mt-3 w-full text-xs text-champagne-600 hover:text-champagne-700 bg-champagne-100/50 hover:bg-champagne-100 rounded-lg py-1.5 transition-colors"
                          >
                            {showTemplatePreview.value ? '收起预览' : '查看模板详情'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div
                    onClick$={() => {
                      selectedTemplateId.value = '';
                    }}
                    class={`cursor-pointer rounded-xl border-2 border-dashed p-4 transition-all flex flex-col items-center justify-center min-h-[100px] ${
                      selectedTemplateId.value === ''
                        ? 'border-champagne-500 bg-champagne-50/50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <p
                      class={`text-sm font-medium ${
                        selectedTemplateId.value === '' ? 'text-champagne-700' : 'text-gray-500'
                      }`}
                    >
                      不使用模板
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                      手动配置所有内容
                    </p>
                  </div>
                </div>
              </div>

              {showTemplatePreview.value && selectedTemplateId.value &&
                (() => {
                  const selected = templates.value.find(
                    (t) => t.id === selectedTemplateId.value
                  );
                  if (!selected) return null;
                  return (
                    <div class="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {selected.storageCards.length > 0 && (
                        <div>
                          <p class="text-sm font-medium text-gray-700 mb-2">📸 存储卡检查项 ({selected.storageCards.length}张)
                          </p>
                          <div class="flex flex-wrap gap-2">
                            {selected.storageCards.map((card, i) => (
                              <span
                                key={i}
                                class="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md border border-gray-200"
                              >
                                {DEVICE_TYPE_ICONS[card.deviceType]} {card.cardLabel} - {card.deviceName} ({card.capacity})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selected.backupLocations.length > 0 && (
                        <div>
                          <p class="text-sm font-medium text-gray-700 mb-2">💽 备份位置建议 ({selected.backupLocations.length}个)
                          </p>
                          <div class="flex flex-wrap gap-2">
                            {selected.backupLocations.map((bk, i) => (
                              <span
                                key={i}
                                class="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md border border-gray-200"
                              >
                                {BACKUP_LOCATION_TYPE_ICONS[bk.locationType]} {bk.location}
                                ({BACKUP_LOCATION_TYPE_LABELS[bk.locationType]})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selected.missingItems.length > 0 && (
                        <div>
                          <p class="text-sm font-medium text-gray-700 mb-2">✅ 缺失核对项 ({selected.missingItems.length}项)
                          </p>
                          <div class="space-y-1.5">
                            {selected.missingItems.map((item, i) => (
                              <div
                                key={i}
                                class="flex items-center gap-2 text-xs"
                              >
                                <span
                                  class={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    item.severity === 'high'
                                      ? 'bg-wine-100 text-wine-700'
                                      : item.severity === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {MISSING_SEVERITY_LABELS[item.severity]}
                                </span>
                                <span class="text-gray-600">{item.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selected.handoverNote && (
                        <div>
                          <p class="text-sm font-medium text-gray-700 mb-2">📝 交接备注草稿
                          </p>
                          <div class="p-3 bg-champagne-50 rounded-lg border border-champagne-100">
                            <p class="text-xs text-gray-600 whitespace-pre-wrap">
                              {selected.handoverNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}

          <div class="card-base">
            <h2 class="text-lg font-display font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <span class="w-1 h-6 bg-champagne-500 rounded-full" />
              基本信息
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  项目编号 <span class="text-wine-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectNumber.value}
                  onInput$={(e) => {
                    projectNumber.value = (e.target as HTMLInputElement).value;
                    if (errors.value.projectNumber) {
                      errors.value = { ...errors.value, projectNumber: '' };
                    }
                  }}
                  onBlur$={() => {
                    const result = runValidation(
                      {
                        projectNumber: projectNumber.value,
                        coupleName: coupleName.value,
                        weddingDate: weddingDate.value,
                        photographer: photographer.value,
                        videographer: videographer.value,
                        cardCount: cardCount.value,
                        handoverStatus: handoverStatus.value,
                        anomalyNote: anomalyNote.value,
                      },
                      { isEdit: mode === 'edit', currentId: initialData?.id, currentRecoveredCount: initialData?.recoveredCount, currentBackupCount: initialData?.backupCount }
                    );
                    errors.value = result.errors;
                  }}
                  placeholder="如：WED20240601"
                  class={`input-base ${
                    errors.value.projectNumber
                      ? 'border-wine-400 focus:border-wine-400 focus:ring-wine-100'
                      : ''
                  }`}
                />
                {errors.value.projectNumber && (
                  <p class="mt-1 text-xs text-wine-500">{errors.value.projectNumber}</p>
                )}
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  新人姓名 <span class="text-wine-500">*</span>
                </label>
                <input
                  type="text"
                  value={coupleName.value}
                  onInput$={(e) => {
                    coupleName.value = (e.target as HTMLInputElement).value;
                    if (errors.value.coupleName) {
                      errors.value = { ...errors.value, coupleName: '' };
                    }
                  }}
                  onBlur$={() => {
                    const result = runValidation(
                      {
                        projectNumber: projectNumber.value,
                        coupleName: coupleName.value,
                        weddingDate: weddingDate.value,
                        photographer: photographer.value,
                        videographer: videographer.value,
                        cardCount: cardCount.value,
                        handoverStatus: handoverStatus.value,
                        anomalyNote: anomalyNote.value,
                      },
                      { isEdit: mode === 'edit', currentId: initialData?.id, currentRecoveredCount: initialData?.recoveredCount, currentBackupCount: initialData?.backupCount }
                    );
                    errors.value = result.errors;
                  }}
                  placeholder="如：张三 & 李四"
                  class={`input-base ${
                    errors.value.coupleName
                      ? 'border-wine-400 focus:border-wine-400 focus:ring-wine-100'
                      : ''
                  }`}
                />
                {errors.value.coupleName && (
                  <p class="mt-1 text-xs text-wine-500">{errors.value.coupleName}</p>
                )}
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  婚礼日期 <span class="text-wine-500">*</span>
                </label>
                <input
                  type="date"
                  value={weddingDate.value}
                  max={getTodayDateString()}
                  onInput$={(e) => {
                    weddingDate.value = (e.target as HTMLInputElement).value;
                    if (errors.value.weddingDate) {
                      errors.value = { ...errors.value, weddingDate: '' };
                    }
                  }}
                  onBlur$={() => {
                    const result = runValidation(
                      {
                        projectNumber: projectNumber.value,
                        coupleName: coupleName.value,
                        weddingDate: weddingDate.value,
                        photographer: photographer.value,
                        videographer: videographer.value,
                        cardCount: cardCount.value,
                        handoverStatus: handoverStatus.value,
                        anomalyNote: anomalyNote.value,
                      },
                      { isEdit: mode === 'edit', currentId: initialData?.id, currentRecoveredCount: initialData?.recoveredCount, currentBackupCount: initialData?.backupCount }
                    );
                    errors.value = result.errors;
                  }}
                  class={`input-base ${
                    errors.value.weddingDate
                      ? 'border-wine-400 focus:border-wine-400 focus:ring-wine-100'
                      : ''
                  }`}
                />
                {errors.value.weddingDate && (
                  <p class="mt-1 text-xs text-wine-500">{errors.value.weddingDate}</p>
                )}
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  存储卡数量
                </label>
                <input
                  type="number"
                  min={0}
                  value={cardCount.value}
                  onInput$={(e) => {
                    cardCount.value = parseInt((e.target as HTMLInputElement).value) || 0;
                    if (errors.value.cardCount) {
                      errors.value = { ...errors.value, cardCount: '' };
                    }
                  }}
                  onBlur$={() => {
                    const result = runValidation(
                      {
                        projectNumber: projectNumber.value,
                        coupleName: coupleName.value,
                        weddingDate: weddingDate.value,
                        photographer: photographer.value,
                        videographer: videographer.value,
                        cardCount: cardCount.value,
                        handoverStatus: handoverStatus.value,
                        anomalyNote: anomalyNote.value,
                      },
                      { isEdit: mode === 'edit', currentId: initialData?.id, currentRecoveredCount: initialData?.recoveredCount, currentBackupCount: initialData?.backupCount }
                    );
                    errors.value = result.errors;
                  }}
                  class={`input-base ${
                    errors.value.cardCount
                      ? 'border-wine-400 focus:border-wine-400 focus:ring-wine-100'
                      : ''
                  }`}
                />
                {errors.value.cardCount && (
                  <p class="mt-1 text-xs text-wine-500">{errors.value.cardCount}</p>
                )}
              </div>
            </div>
          </div>

          <div class="card-base">
            <h2 class="text-lg font-display font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <span class="w-1 h-6 bg-champagne-500 rounded-full" />
              人员安排
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  摄影师
                </label>
                <input
                  type="text"
                  value={photographer.value}
                  onInput$={(e) => {
                    photographer.value = (e.target as HTMLInputElement).value;
                  }}
                  placeholder="请输入摄影师姓名"
                  class="input-base"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  摄像师
                </label>
                <input
                  type="text"
                  value={videographer.value}
                  onInput$={(e) => {
                    videographer.value = (e.target as HTMLInputElement).value;
                  }}
                  placeholder="请输入摄像师姓名"
                  class="input-base"
                />
              </div>
            </div>
          </div>

          <div class="card-base">
            <h2 class="text-lg font-display font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <span class="w-1 h-6 bg-champagne-500 rounded-full" />
              交接状态
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  交接状态
                </label>
                <select
                  value={handoverStatus.value}
                  onChange$={(e) => {
                    handoverStatus.value = (e.target as HTMLSelectElement).value as HandoverStatus;
                    const result = runValidation(
                      {
                        projectNumber: projectNumber.value,
                        coupleName: coupleName.value,
                        weddingDate: weddingDate.value,
                        photographer: photographer.value,
                        videographer: videographer.value,
                        cardCount: cardCount.value,
                        handoverStatus: handoverStatus.value,
                        anomalyNote: anomalyNote.value,
                      },
                      { isEdit: mode === 'edit', currentId: initialData?.id, currentRecoveredCount: initialData?.recoveredCount, currentBackupCount: initialData?.backupCount }
                    );
                    errors.value = result.errors;
                  }}
                  class="input-base appearance-none bg-white cursor-pointer"
                >
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.value.handoverStatus && (
                  <p class="mt-1 text-xs text-wine-500">{errors.value.handoverStatus}</p>
                )}
              </div>
            </div>

            {showAnomalyNote && (
              <div class="mt-6">
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  异常说明 <span class="text-wine-500">*</span>
                  <span class="text-gray-400 font-normal ml-2">
                    不少于8个字
                  </span>
                </label>
                <textarea
                  value={anomalyNote.value}
                  onInput$={(e) => {
                    anomalyNote.value = (e.target as HTMLTextAreaElement).value;
                    if (errors.value.anomalyNote) {
                      errors.value = { ...errors.value, anomalyNote: '' };
                    }
                  }}
                  onBlur$={() => {
                    const result = runValidation(
                      {
                        projectNumber: projectNumber.value,
                        coupleName: coupleName.value,
                        weddingDate: weddingDate.value,
                        photographer: photographer.value,
                        videographer: videographer.value,
                        cardCount: cardCount.value,
                        handoverStatus: handoverStatus.value,
                        anomalyNote: anomalyNote.value,
                      },
                      { isEdit: mode === 'edit', currentId: initialData?.id, currentRecoveredCount: initialData?.recoveredCount, currentBackupCount: initialData?.backupCount }
                    );
                    errors.value = result.errors;
                  }}
                  rows={4}
                  placeholder="请详细描述异常情况..."
                  class={`input-base resize-none ${
                    errors.value.anomalyNote
                      ? 'border-wine-400 focus:border-wine-400 focus:ring-wine-100'
                      : ''
                  }`}
                />
                {errors.value.anomalyNote && (
                  <p class="mt-1 text-xs text-wine-500">{errors.value.anomalyNote}</p>
                )}
              </div>
            )}
          </div>

          {errors.value.submit && (
            <div class="p-4 bg-wine-50 border border-wine-200 rounded-xl text-wine-600">
              {errors.value.submit}
            </div>
          )}

          <div class="flex justify-end gap-4">
            <Link
              href={mode === 'edit' && initialData?.id ? `/project/${initialData.id}` : '/'}
              class="btn-secondary flex items-center justify-center no-underline"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={isSubmitting.value}
              class={`btn-primary ${isSubmitting.value ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting.value ? '提交中...' : mode === 'create' ? '创建项目' : '保存修改'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
});
