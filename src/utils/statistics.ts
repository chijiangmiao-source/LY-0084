import type { WeddingProject, ProjectStatistics } from '~/types/project';

export function calculateStatistics(projects: WeddingProject[]): ProjectStatistics {
  return {
    total: projects.length,
    pending: projects.filter((p) => p.handoverStatus === 'pending').length,
    backingUp: projects.filter(
      (p) => p.handoverStatus === 'backing_up' || p.handoverStatus === 'recovering'
    ).length,
    completed: projects.filter(
      (p) => p.handoverStatus === 'completed' || p.handoverStatus === 'handed_over' || p.handoverStatus === 'editing'
    ).length,
    anomaly: projects.filter((p) => p.handoverStatus === 'anomaly').length,
  };
}

export function filterProjects(
  projects: WeddingProject[],
  options: {
    keyword?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): WeddingProject[] {
  let filtered = [...projects];

  if (options.keyword && options.keyword.trim()) {
    const keyword = options.keyword.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.projectNumber.toLowerCase().includes(keyword) ||
        p.coupleName.toLowerCase().includes(keyword) ||
        p.photographer.toLowerCase().includes(keyword) ||
        p.videographer.toLowerCase().includes(keyword)
    );
  }

  if (options.status && options.status !== 'all') {
    const statusVal = options.status;
    filtered = filtered.filter((p) => p.handoverStatus === statusVal);
  }

  if (options.dateFrom) {
    const dateFromVal = options.dateFrom;
    filtered = filtered.filter((p) => p.weddingDate >= dateFromVal);
  }

  if (options.dateTo) {
    const dateToVal = options.dateTo;
    filtered = filtered.filter((p) => p.weddingDate <= dateToVal);
  }

  return filtered;
}

export function getStatusChartData(projects: WeddingProject[]): {
  labels: string[];
  values: number[];
  colors: string[];
} {
  const statusMap: Record<string, { label: string; color: string; count: number }> = {
    pending: { label: '待交接', color: '#9CA3AF', count: 0 },
    recovering: { label: '回收中', color: '#60A5FA', count: 0 },
    backing_up: { label: '备份中', color: '#F59E0B', count: 0 },
    backed_up: { label: '备份完成', color: '#10B981', count: 0 },
    handed_over: { label: '已交接', color: '#D4AF37', count: 0 },
    editing: { label: '待剪辑', color: '#A855F7', count: 0 },
    completed: { label: '已完成', color: '#2F4F4F', count: 0 },
    anomaly: { label: '异常', color: '#722F37', count: 0 },
  };

  projects.forEach((p) => {
    if (statusMap[p.handoverStatus]) {
      statusMap[p.handoverStatus].count++;
    }
  });

  const entries = Object.values(statusMap).filter((s) => s.count > 0);

  return {
    labels: entries.map((s) => s.label),
    values: entries.map((s) => s.count),
    colors: entries.map((s) => s.color),
  };
}

export function getMonthlyStats(projects: WeddingProject[]): {
  labels: string[];
  values: number[];
} {
  const monthMap = new Map<string, number>();

  projects.forEach((p) => {
    const date = new Date(p.weddingDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
  });

  const sortedMonths = Array.from(monthMap.keys()).sort().slice(-6);

  return {
    labels: sortedMonths,
    values: sortedMonths.map((m) => monthMap.get(m) || 0),
  };
}

export function calculateBackupProgress(project: WeddingProject): number {
  if (project.cardCount === 0) return 0;
  return Math.round((project.backupCount / project.cardCount) * 100);
}

export function calculateRecoveryProgress(project: WeddingProject): number {
  if (project.cardCount === 0) return 0;
  return Math.round((project.recoveredCount / project.cardCount) * 100);
}

export function calculateAutoStatus(project: WeddingProject, cardCount: number, recoveredCount: number, backupCount: number): WeddingProject['handoverStatus'] {
  if (project.handoverStatus === 'anomaly' || 
      project.handoverStatus === 'editing' || 
      project.handoverStatus === 'completed' ||
      project.handoverStatus === 'handed_over') {
    return project.handoverStatus;
  }

  if (cardCount === 0) {
    return 'pending';
  }

  if (recoveredCount === 0 && backupCount === 0) {
    return 'pending';
  }

  if (recoveredCount < cardCount) {
    return 'recovering';
  }

  if (recoveredCount === cardCount && backupCount < cardCount) {
    return 'backing_up';
  }

  if (recoveredCount === cardCount && backupCount >= cardCount) {
    return 'backed_up';
  }

  return project.handoverStatus;
}
