import { component$, useSignal, $ } from '@builder.io/qwik';
import type { WeddingProject } from '~/types/project';
import { projectStorage, logActivity } from '~/utils/storage';

interface HandoverNoteProps {
  projectId: string;
  project: WeddingProject;
  onUpdate$: () => void;
}

export const HandoverNote = component$<HandoverNoteProps>(({ projectId, project, onUpdate$ }) => {
  const isEditing = useSignal(false);
  const noteContent = useSignal(project.handoverNote || '');

  const saveNote = $(() => {
    const newNote = noteContent.value.trim();

    projectStorage.update(projectId, { handoverNote: newNote });

    logActivity(
      projectId,
      'handover_note_update',
      newNote ? '更新了交接备注' : '清空了交接备注',
      {
        oldNote: project.handoverNote,
        newNote,
      }
    );

    project.handoverNote = newNote;
    isEditing.value = false;
    onUpdate$();
  });

  const cancelEdit = $(() => {
    noteContent.value = project.handoverNote || '';
    isEditing.value = false;
  });

  const quickNotes = [
    '所有素材已完整回收',
    '已完成双备份校验',
    '等待客户确认交接',
    '已转交给后期团队',
    '存在异常情况，需关注',
  ];

  return (
    <div class="card-base">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-display font-semibold text-gray-700 flex items-center gap-2">
          <span class="w-1 h-6 bg-champagne-500 rounded-full" />
          交接备注
        </h3>
        {!isEditing.value && (
          <button
            onClick$={() => {
              noteContent.value = project.handoverNote || '';
              isEditing.value = true;
            }}
            class="text-champagne-600 hover:text-champagne-700 text-sm font-medium transition-colors"
          >
            ✏️ 编辑
          </button>
        )}
      </div>

      {isEditing.value ? (
        <div class="space-y-4">
          <textarea
            value={noteContent.value}
            onInput$={(e) => (noteContent.value = (e.target as HTMLTextAreaElement).value)}
            placeholder="请输入交接备注信息..."
            rows={6}
            class="input-base resize-none text-sm"
          />
          <div>
            <p class="text-xs text-gray-500 mb-2">快捷备注：</p>
            <div class="flex flex-wrap gap-2">
              {quickNotes.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick$={() => {
                    noteContent.value = noteContent.value
                      ? `${noteContent.value}\n${note}`
                      : note;
                  }}
                  class="px-3 py-1 text-xs bg-white border border-champagne-200 rounded-full text-champagne-700 hover:bg-champagne-50 transition-colors"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>
          <div class="flex gap-3">
            <button
              onClick$={saveNote}
              class="btn-primary text-sm py-2 px-6"
            >
              保存备注
            </button>
            <button
              onClick$={cancelEdit}
              class="btn-secondary text-sm py-2 px-6"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div>
          {project.handoverNote ? (
            <div class="p-4 bg-champagne-50 rounded-xl border border-champagne-100">
              <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {project.handoverNote}
              </p>
            </div>
          ) : (
            <div class="text-center py-6 text-gray-400">
              <p class="text-3xl mb-2">📝</p>
              <p class="text-sm">暂无交接备注</p>
              <p class="text-xs mt-1">点击右上角"编辑"添加备注</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
