import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import type { HandoverStatus, ProjectFormData } from '~/types/project';
import { HANDOVER_STATUS_LABELS } from '~/types/project';
import { projectStorage, statusLogStorage, cardStorage, backupStorage } from '~/utils/storage';
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

  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

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

        navigate('/');
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

        if (updated && updated.handoverStatus !== initialData.handoverStatus) {
          statusLogStorage.create({
            projectId: initialData.id,
            fromStatus: initialData.handoverStatus,
            toStatus: handoverStatus.value,
            remark: '状态变更',
            timestamp: new Date().toISOString(),
          });
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
