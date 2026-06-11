import { component$ } from '@builder.io/qwik';

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
}

export const StatCard = component$<StatCardProps>(({ label, value, icon, color, bgColor }) => {
  return (
    <div class="card-base card-hover flex items-center gap-4">
      <div class={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center text-2xl`}>
        <span>{icon}</span>
      </div>
      <div>
        <p class="text-gray-500 text-sm">{label}</p>
        <p class={`text-3xl font-bold ${color} font-display`}>{value}</p>
      </div>
    </div>
  );
});
