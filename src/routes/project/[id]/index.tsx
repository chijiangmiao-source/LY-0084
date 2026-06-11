import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useLocation, useNavigate } from '@builder.io/qwik-city';
import type { WeddingProject, StatusLog, HandoverStatus } from '~/types/project';
import { HANDOVER_STATUS_LABELS } from '~/types/project';
import { StatusBadge } from '~/components/ui/StatusBadge';
import { StorageCardList } from '~/components/detail/StorageCardList';
import { BackupStatus } from '~/components/detail/BackupStatus';
import { MissingItems } from '~/components/detail/MissingItems';
import { StatusTimeline } from '~/components/detail/StatusTimeline';
import { projectStorage, statusLogStorage, cardStorage, backupStorage, missingStorage } from '~/utils/storage';
import { formatDate, formatDateTime } from '~/utils/dateUtils';
import { validateHandoverStatusChange } from '~/utils/validators';
import { calculateBackupProgress, calculateRecoveryProgress } from '~/utils/statistics';

export default component$(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = location.params.id;

  const project = useSignal<WeddingProject | null>(null);
  const statusLogs = useSignal<StatusLog[]>([]);
  const notFound = useSignal(false);
  const errorMessage = useSignal('');
  const showStatusModal = useSignal(false);
  const newStatus = useSignal<HandoverStatus>('pending');
  const statusRemark = useSignal('');

  useVisibleTask$(() => {
    const data = projectStorage.getById(projectId);
    if (!data) {
      notFound.value = true;
      return;
    }
    project.value = data;
    statusLogs.value = statusLogStorage.getByProjectId(projectId);
  });

  const handleUpdate = $(() => {
    const data = projectStorage.getById(projectId);
    if (data) {
      project.value = data;
      statusLogs.value = statusLogStorage.getByProjectId(projectId);
    }
  });

  const openStatusModal = $((status: HandoverStatus) => {
    newStatus.value = status;
    statusRemark.value = '';
    errorMessage.value = '';
    showStatusModal.value = true;
  });

  const changeStatus = $(() => {
    if (!project.value) return;

    const validation = validateHandoverStatusChange(project.value, newStatus.value);
    if (!validation.valid) {
      errorMessage.value = Object.values(validation.errors).join('；');
      return;
    }

    const updated = projectStorage.update(projectId, {
      handoverStatus: newStatus.value,
    });

    if (updated) {
      statusLogStorage.create({
        projectId,
        fromStatus: project.value.handoverStatus,
        toStatus: newStatus.value,
        remark: statusRemark.value || '状态变更',
        timestamp: new Date().toISOString(),
      });
    }

    showStatusModal.value = false;
    const data = projectStorage.getById(projectId);
    if (data) {
      project.value = data;
      statusLogs.value = statusLogStorage.getByProjectId(projectId);
    }
  });

  const deleteProject = $(() => {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) return;
    if (!confirm('再次确认：真的要删除这个项目吗？所有相关数据都会被删除。')) return;

    projectStorage.delete(projectId);
    cardStorage.deleteByProjectId(projectId);
    backupStorage.deleteByProjectId(projectId);
    missingStorage.deleteByProjectId(projectId);
    statusLogStorage.deleteByProjectId(projectId);

    navigate('/');
  });

  if (notFound.value) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <div class="text-6xl mb-4">🔍</div>
          <h2 class="text-xl font-display font-semibold text-gray-800 mb-2">项目不存在</h2>
          <p class="text-gray-500 mb-4">找不到对应的婚礼项目</p>
          <Link href="/" class="btn-primary inline-flex no-underline">
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  if (!project.value) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <p class="text-gray-500">加载中...</p>
      </div>
    );
  }

  const p = project.value;
  const backupProgress = calculateBackupProgress(p);
  const recoveryProgress = calculateRecoveryProgress(p);

  const availableStatuses: { status: HandoverStatus; label: string; action: string }[] = [
    { status: 'recovering', label: '开始回收', action: '开始回收存储卡' },
    { status: 'backing_up', label: '开始备份', action: '开始进行备份' },
    { status: 'backed_up', label: '备份完成', action: '标记备份完成' },
    { status: 'handed_over', label: '确认交接', action: '确认交接完成' },
    { status: 'completed', label: '标记完成', action: '标记项目完成' },
    { status: 'anomaly', label: '标记异常', action: '标记为异常状态' },
  ];

  return (
    <div class="min-h-screen">
      <header class="bg-white/80 backdrop-blur-md border-b border-champagne-100 sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <Link href="/" class="text-gray-500 hover:text-gray-700 transition-colors">
              ← 返回列表
            </Link>
            <div class="w-px h-6 bg-gray-200" />
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-display font-bold text-gray-800">{p.coupleName}</h1>
                <StatusBadge status={p.handoverStatus} />
              </div>
              <p class="text-xs text-gray-400">{p.projectNumber}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Link
              href={`/project/${projectId}/edit`}
              class="btn-secondary text-sm no-underline"
            >
              编辑项目
            </Link>
            <button
              onClick$={deleteProject}
              class="px-4 py-2 text-wine-500 hover:bg-wine-50 rounded-xl text-sm transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 space-y-6">
            <div class="card-base">
              <h3 class="text-lg font-display font-semibold text-gray-700 mb-4">项目信息</h3>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">项目编号</span>
                  <span class="font-medium text-gray-800">{p.projectNumber}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">新人姓名</span>
                  <span class="font-medium text-gray-800">{p.coupleName}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">婚礼日期</span>
                  <span class="font-medium text-gray-800">{formatDate(p.weddingDate)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">摄影师</span>
                  <span class="font-medium text-gray-800">{p.photographer || '未安排'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">摄像师</span>
                  <span class="font-medium text-gray-800">{p.videographer || '未安排'}</span>
                </div>
              </div>
            </div>

            <div class="card-base">
              <h3 class="text-lg font-display font-semibold text-gray-700 mb-4">进度概览</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm mb-1.5">
                    <span class="text-gray-500">存储卡回收</span>
                    <span class="font-medium">{p.recoveredCount} / {p.cardCount}</span>
                  </div>
                  <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${recoveryProgress}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div class="flex justify-between text-sm mb-1.5">
                    <span class="text-gray-500">备份进度</span>
                    <span class="font-medium">{p.backupCount} / {p.cardCount}</span>
                  </div>
                  <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-champagne-500 rounded-full transition-all duration-500"
                      style={{ width: `${backupProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="card-base">
              <h3 class="text-lg font-display font-semibold text-gray-700 mb-4">快速操作</h3>
              <div class="space-y-2">
                {availableStatuses
                  .filter((s) => s.status !== p.handoverStatus)
                  .map((item) => (
                    <button
                      key={item.status}
                      onClick$={() => openStatusModal(item.status)}
                      class="w-full text-left px-4 py-2.5 rounded-xl text-sm hover:bg-champagne-50 transition-colors text-gray-700 hover:text-champagne-700"
                    >
                      {item.action}
                    </button>
                  ))}
              </div>
            </div>

            <div class="card-base">
              <h3 class="text-lg font-display font-semibold text-gray-700 mb-4">状态时间线</h3>
              <StatusTimeline logs={statusLogs.value} />
            </div>
          </div>

          <div class="lg:col-span-2 space-y-6">
            <StorageCardList
              projectId={projectId}
              project={p}
              onUpdate$={handleUpdate}
            />

            <BackupStatus
              projectId={projectId}
              project={p}
              onUpdate$={handleUpdate}
            />

            <MissingItems projectId={projectId} />

            {p.handoverStatus === 'anomaly' && p.anomalyNote && (
              <div class="card-base bg-wine-50 border-wine-200">
                <h3 class="text-lg font-display font-semibold text-wine-700 mb-3 flex items-center gap-2">
                  <span>⚠️</span>
                  异常说明
                </h3>
                <p class="text-wine-600">{p.anomalyNote}</p>
              </div>
            )}

            <div class="card-base">
              <h3 class="text-lg font-display font-semibold text-gray-700 mb-3">时间信息</h3>
              <div class="flex gap-8 text-sm text-gray-500">
                <div>
                  <span class="text-gray-400">创建时间：</span>
                  <span>{formatDateTime(p.createdAt)}</span>
                </div>
                <div>
                  <span class="text-gray-400">更新时间：</span>
                  <span>{formatDateTime(p.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showStatusModal.value && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 class="text-lg font-display font-semibold text-gray-800 mb-4">
              变更状态为：{HANDOVER_STATUS_LABELS[newStatus.value]}
            </h3>
            {errorMessage.value && (
              <div class="mb-4 p-3 bg-wine-50 border border-wine-200 rounded-xl text-wine-600 text-sm">
                {errorMessage.value}
              </div>
            )}
            <div class="mb-4">
              <label class="block text-sm text-gray-600 mb-1.5">备注（可选）</label>
              <textarea
                value={statusRemark.value}
                onInput$={(e) => (statusRemark.value = (e.target as HTMLTextAreaElement).value)}
                rows={3}
                placeholder="请输入状态变更备注..."
                class="input-base resize-none"
              />
            </div>
            <div class="flex gap-3">
              <button
                onClick$={() => (showStatusModal.value = false)}
                class="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick$={changeStatus}
                class="flex-1 btn-primary"
              >
                确认变更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
