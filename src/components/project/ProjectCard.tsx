import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import type { WeddingProject } from '~/types/project';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDate } from '~/utils/dateUtils';
import { calculateBackupProgress, calculateRecoveryProgress } from '~/utils/statistics';

interface ProjectCardProps {
  project: WeddingProject;
}

export const ProjectCard = component$<ProjectCardProps>(({ project }) => {
  const backupProgress = calculateBackupProgress(project);
  const recoveryProgress = calculateRecoveryProgress(project);

  return (
    <Link href={`/project/${project.id}`} class="block no-underline text-inherit">
      <div class="card-base card-hover cursor-pointer">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-xs text-gray-400 font-medium tracking-wide uppercase">{project.projectNumber}</p>
            <h3 class="text-xl font-display font-semibold text-gray-800 mt-1">
              {project.coupleName}
            </h3>
          </div>
          <StatusBadge status={project.handoverStatus} />
        </div>

        <div class="space-y-3 text-sm text-gray-600 mb-4">
          <div class="flex items-center gap-2">
            <span class="text-champagne-500">📅</span>
            <span>{formatDate(project.weddingDate)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-champagne-500">📸</span>
            <span>摄影：{project.photographer || '未安排'}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-champagne-500">🎥</span>
            <span>摄像：{project.videographer || '未安排'}</span>
          </div>
        </div>

        <div class="border-t border-gray-100 pt-4 space-y-3">
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>存储卡回收</span>
              <span>{project.recoveredCount} / {project.cardCount}</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${recoveryProgress}%` }}
              />
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>备份进度</span>
              <span>{project.backupCount} / {project.cardCount}</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-champagne-400 to-champagne-500 rounded-full transition-all duration-500"
                style={{ width: `${backupProgress}%` }}
              />
            </div>
          </div>
        </div>

        {project.handoverStatus === 'anomaly' && project.anomalyNote && (
          <div class="mt-4 p-3 bg-wine-50 border border-wine-100 rounded-xl">
            <p class="text-xs text-wine-600 font-medium mb-1">⚠️ 异常说明</p>
            <p class="text-sm text-wine-700 line-clamp-2">{project.anomalyNote}</p>
          </div>
        )}
      </div>
    </Link>
  );
});
