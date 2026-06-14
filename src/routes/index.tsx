import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import type { WeddingProject, ProjectStatistics } from '~/types/project';
import { StatCard } from '~/components/project/StatCard';
import { SearchFilter } from '~/components/project/SearchFilter';
import { ProjectCard } from '~/components/project/ProjectCard';
import { StatusChart } from '~/components/project/StatusChart';
import { projectStorage } from '~/utils/storage';
import { calculateStatistics, filterProjects, getStatusChartData } from '~/utils/statistics';
import { getTodayDateString } from '~/utils/dateUtils';

export const useProjectsLoader = routeLoader$(async () => {
  return {
    projects: [] as WeddingProject[],
  };
});

export default component$(() => {
  const projects = useSignal<WeddingProject[]>([]);
  const filteredProjects = useSignal<WeddingProject[]>([]);
  const statistics = useSignal<ProjectStatistics>({
    total: 0,
    pending: 0,
    backingUp: 0,
    completed: 0,
    anomaly: 0,
  });

  const keyword = useSignal('');
  const status = useSignal('all');
  const dateFrom = useSignal('');
  const dateTo = useSignal('');

  const chartData = useSignal<{ labels: string[]; values: number[]; colors: string[] }>({
    labels: [],
    values: [],
    colors: [],
  });

  const loadProjects = $(() => {
    const allProjects = projectStorage.getAll();
    projects.value = allProjects;
    statistics.value = calculateStatistics(allProjects);
    chartData.value = getStatusChartData(allProjects);
    filteredProjects.value = filterProjects(allProjects, {
      keyword: keyword.value,
      status: status.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
    });
  });

  useVisibleTask$(() => {
    loadProjects();
  });

  const handleKeywordChange = $((value: string) => {
    keyword.value = value;
    filteredProjects.value = filterProjects(projects.value, {
      keyword: value,
      status: status.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
    });
  });

  const handleStatusChange = $((value: string) => {
    status.value = value;
    filteredProjects.value = filterProjects(projects.value, {
      keyword: keyword.value,
      status: value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
    });
  });

  const handleDateFromChange = $((value: string) => {
    dateFrom.value = value;
    filteredProjects.value = filterProjects(projects.value, {
      keyword: keyword.value,
      status: status.value,
      dateFrom: value,
      dateTo: dateTo.value,
    });
  });

  const handleDateToChange = $((value: string) => {
    dateTo.value = value;
    filteredProjects.value = filterProjects(projects.value, {
      keyword: keyword.value,
      status: status.value,
      dateFrom: dateFrom.value,
      dateTo: value,
    });
  });

  const handleReset = $(() => {
    keyword.value = '';
    status.value = 'all';
    dateFrom.value = '';
    dateTo.value = '';
    filteredProjects.value = filterProjects(projects.value, {
      keyword: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    });
  });

  return (
    <div class="min-h-screen">
      <header class="bg-white/80 backdrop-blur-md border-b border-champagne-100 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-champagne-400 to-champagne-600 rounded-xl flex items-center justify-center text-white text-xl">
              💒
            </div>
            <div>
              <h1 class="text-xl font-display font-bold text-gray-800">婚礼跟拍素材交接台</h1>
              <p class="text-xs text-gray-400">素材管理 · 安全可追溯</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Link href="/templates" class="btn-secondary flex items-center gap-2 no-underline">
              <span>📋</span>
              <span>模板管理</span>
            </Link>
            <Link href="/project/new" class="btn-primary flex items-center gap-2 no-underline">
              <span>+</span>
              <span>新建项目</span>
            </Link>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-6 py-8">
        <section class="mb-8">
          <h2 class="text-lg font-display font-semibold text-gray-700 mb-4">数据概览</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="项目总数"
              value={statistics.value.total}
              icon="📊"
              color="text-champagne-600"
              bgColor="bg-champagne-50"
            />
            <StatCard
              label="待交接"
              value={statistics.value.pending}
              icon="⏳"
              color="text-gray-600"
              bgColor="bg-gray-50"
            />
            <StatCard
              label="处理中"
              value={statistics.value.backingUp}
              icon="🔄"
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              label="已完成"
              value={statistics.value.completed}
              icon="✅"
              color="text-forest-600"
              bgColor="bg-forest-50"
            />
            <StatCard
              label="异常项目"
              value={statistics.value.anomaly}
              icon="⚠️"
              color="text-wine-600"
              bgColor="bg-wine-50"
            />
          </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div class="lg:col-span-2">
            <SearchFilter
              keyword={keyword.value}
              status={status.value}
              dateFrom={dateFrom.value}
              dateTo={dateTo.value}
              onKeywordChange$={handleKeywordChange}
              onStatusChange$={handleStatusChange}
              onDateFromChange$={handleDateFromChange}
              onDateToChange$={handleDateToChange}
              onReset$={handleReset}
            />
          </div>
          <div class="card-base">
            <h3 class="text-base font-display font-semibold text-gray-700 mb-4">状态分布</h3>
            <StatusChart
              labels={chartData.value.labels}
              values={chartData.value.values}
              colors={chartData.value.colors}
            />
          </div>
        </div>

        <section>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-display font-semibold text-gray-700">
              项目列表
              <span class="ml-2 text-sm font-normal text-gray-400">
                共 {filteredProjects.value.length} 个项目
              </span>
            </h2>
          </div>

          {filteredProjects.value.length === 0 ? (
            <div class="card-base text-center py-16">
              <div class="text-6xl mb-4">📁</div>
              <p class="text-gray-500 mb-2">
                {projects.value.length === 0 ? '还没有任何项目' : '没有匹配的项目'}
              </p>
              {projects.value.length === 0 && (
                <Link href="/project/new" class="btn-primary inline-flex items-center gap-2 no-underline mt-4">
                  <span>+</span>
                  <span>创建第一个项目</span>
                </Link>
              )}
            </div>
          ) : (
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.value.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer class="mt-16 py-8 border-t border-champagne-100">
        <div class="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          <p>婚礼跟拍素材交接核对台 · 数据本地存储，安全可靠</p>
        </div>
      </footer>
    </div>
  );
});
