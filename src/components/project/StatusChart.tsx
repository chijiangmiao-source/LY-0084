import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import Chart from 'chart.js/auto';

interface StatusChartProps {
  labels: string[];
  values: number[];
  colors: string[];
}

export const StatusChart = component$<StatusChartProps>(({ labels, values, colors }) => {
  const canvasRef = useSignal<HTMLCanvasElement | undefined>();
  const chartInstance = useSignal<Chart | null>(null);

  useVisibleTask$(({ track }) => {
    track(() => labels);
    track(() => values);
    track(() => colors);

    const canvas = canvasRef.value;
    if (!canvas) return;

    if (chartInstance.value) {
      chartInstance.value.destroy();
      chartInstance.value = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartInstance.value = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            cornerRadius: 8,
          },
        },
        cutout: '65%',
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 800,
          easing: 'easeOutQuart',
        },
      },
    });
  });

  return (
    <div class="h-64">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
});
