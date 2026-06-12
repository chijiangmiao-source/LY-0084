import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { useLocation, Link } from '@builder.io/qwik-city';
import { ProjectForm } from '~/components/project/ProjectForm';
import { projectStorage } from '~/utils/storage';
import type { ProjectFormData, HandoverStatus } from '~/types/project';

const EMPTY_INITIAL: ProjectFormData & { id: string; recoveredCount: number; backupCount: number } = {
  id: '',
  projectNumber: '',
  coupleName: '',
  weddingDate: '',
  photographer: '',
  videographer: '',
  cardCount: 1,
  handoverStatus: 'pending',
  anomalyNote: '',
  recoveredCount: 0,
  backupCount: 0,
};

export default component$(() => {
  const location = useLocation();
  const projectId = location.params.id;
  const initialData = useSignal<(ProjectFormData & { id: string; recoveredCount: number; backupCount: number }) | null>(null);
  const notFound = useSignal(false);
  const isLoaded = useSignal(false);

  useVisibleTask$(() => {
    const project = projectStorage.getById(projectId);
    if (!project) {
      notFound.value = true;
      isLoaded.value = true;
      return;
    }
    initialData.value = {
      id: project.id,
      projectNumber: project.projectNumber,
      coupleName: project.coupleName,
      weddingDate: project.weddingDate,
      photographer: project.photographer,
      videographer: project.videographer,
      cardCount: project.cardCount,
      handoverStatus: project.handoverStatus as HandoverStatus,
      anomalyNote: project.anomalyNote,
      recoveredCount: project.recoveredCount,
      backupCount: project.backupCount,
    };
    isLoaded.value = true;
  });

  return (
    <div class="min-h-screen">
      {notFound.value ? (
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
      ) : !isLoaded.value ? (
        <div class="min-h-screen flex items-center justify-center">
          <p class="text-gray-500">加载中...</p>
        </div>
      ) : initialData.value ? (
        <ProjectForm mode="edit" initialData={initialData.value} />
      ) : null}
    </div>
  );
});
