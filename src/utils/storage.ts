import type {
  WeddingProject,
  StorageCard,
  BackupRecord,
  MissingItem,
  StatusLog,
  ActivityLog,
  ActivityType,
  HandoverTemplate,
} from '~/types/project';

const STORAGE_KEYS = {
  projects: 'wedding_projects',
  cards: 'wedding_cards',
  backups: 'wedding_backups',
  missings: 'wedding_missings',
  statusLogs: 'wedding_status_logs',
  activityLogs: 'wedding_activity_logs',
  templates: 'wedding_templates',
};

function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export const projectStorage = {
  getAll(): WeddingProject[] {
    return safeGet<WeddingProject[]>(STORAGE_KEYS.projects, []);
  },

  getById(id: string): WeddingProject | undefined {
    const projects = this.getAll();
    return projects.find((p) => p.id === id);
  },

  getByNumber(projectNumber: string): WeddingProject | undefined {
    const projects = this.getAll();
    return projects.find((p) => p.projectNumber === projectNumber);
  },

  create(project: Omit<WeddingProject, 'id' | 'createdAt' | 'updatedAt'>): WeddingProject {
    const projects = this.getAll();
    const newProject: WeddingProject = {
      ...project,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.unshift(newProject);
    safeSet(STORAGE_KEYS.projects, projects);
    return newProject;
  },

  update(id: string, updates: Partial<WeddingProject>): WeddingProject | undefined {
    const projects = this.getAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    safeSet(STORAGE_KEYS.projects, projects);
    return projects[index];
  },

  delete(id: string): boolean {
    const projects = this.getAll();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) return false;
    safeSet(STORAGE_KEYS.projects, filtered);
    return true;
  },

  isNumberExists(projectNumber: string, excludeId?: string): boolean {
    const projects = this.getAll();
    return projects.some(
      (p) => p.projectNumber === projectNumber && p.id !== excludeId
    );
  },
};

export const cardStorage = {
  getAll(): StorageCard[] {
    return safeGet<StorageCard[]>(STORAGE_KEYS.cards, []);
  },

  getByProjectId(projectId: string): StorageCard[] {
    return this.getAll().filter((c) => c.projectId === projectId);
  },

  create(card: Omit<StorageCard, 'id'>): StorageCard {
    const cards = this.getAll();
    const newCard: StorageCard = {
      ...card,
      id: generateId(),
      deviceType: card.deviceType || 'camera',
      deviceName: card.deviceName || '',
    };
    cards.push(newCard);
    safeSet(STORAGE_KEYS.cards, cards);
    return newCard;
  },

  update(id: string, updates: Partial<StorageCard>): StorageCard | undefined {
    const cards = this.getAll();
    const index = cards.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    cards[index] = { ...cards[index], ...updates };
    safeSet(STORAGE_KEYS.cards, cards);
    return cards[index];
  },

  delete(id: string): boolean {
    const cards = this.getAll();
    const filtered = cards.filter((c) => c.id !== id);
    if (filtered.length === cards.length) return false;
    safeSet(STORAGE_KEYS.cards, filtered);
    return true;
  },

  deleteByProjectId(projectId: string): void {
    const cards = this.getAll();
    const filtered = cards.filter((c) => c.projectId !== projectId);
    safeSet(STORAGE_KEYS.cards, filtered);
  },

  adjustExcessRecovered(projectId: string, maxAllowed: number): number {
    const cards = this.getAll();
    const projectCards = cards.filter((c) => c.projectId === projectId && c.isRecovered);
    
    if (projectCards.length <= maxAllowed) {
      return projectCards.length;
    }
    
    const excessCount = projectCards.length - maxAllowed;
    const sortedCards = [...projectCards].sort((a, b) => {
      const dateA = a.recoveredAt ? new Date(a.recoveredAt).getTime() : 0;
      const dateB = b.recoveredAt ? new Date(b.recoveredAt).getTime() : 0;
      return dateA - dateB;
    });
    
    for (let i = 0; i < excessCount; i++) {
      const card = sortedCards[i];
      const index = cards.findIndex((c) => c.id === card.id);
      if (index !== -1) {
        cards[index] = { ...cards[index], isRecovered: false, recoveredAt: null };
      }
    }
    
    safeSet(STORAGE_KEYS.cards, cards);
    return maxAllowed;
  },
};

export const backupStorage = {
  getAll(): BackupRecord[] {
    return safeGet<BackupRecord[]>(STORAGE_KEYS.backups, []);
  },

  getByProjectId(projectId: string): BackupRecord[] {
    return this.getAll().filter((b) => b.projectId === projectId);
  },

  create(backup: Omit<BackupRecord, 'id'>): BackupRecord {
    const backups = this.getAll();
    const newBackup: BackupRecord = {
      ...backup,
      id: generateId(),
      locationType: backup.locationType || 'other',
      startedAt: backup.startedAt ?? null,
      verifyStatus: backup.verifyStatus || 'pending',
      verifiedAt: backup.verifiedAt ?? null,
    };
    backups.push(newBackup);
    safeSet(STORAGE_KEYS.backups, backups);
    return newBackup;
  },

  update(id: string, updates: Partial<BackupRecord>): BackupRecord | undefined {
    const backups = this.getAll();
    const index = backups.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    backups[index] = { ...backups[index], ...updates };
    safeSet(STORAGE_KEYS.backups, backups);
    return backups[index];
  },

  delete(id: string): boolean {
    const backups = this.getAll();
    const filtered = backups.filter((b) => b.id !== id);
    if (filtered.length === backups.length) return false;
    safeSet(STORAGE_KEYS.backups, filtered);
    return true;
  },

  deleteByProjectId(projectId: string): void {
    const backups = this.getAll();
    const filtered = backups.filter((b) => b.projectId !== projectId);
    safeSet(STORAGE_KEYS.backups, filtered);
  },

  adjustExcessCompleted(projectId: string, maxAllowed: number): number {
    const backups = this.getAll();
    const projectBackups = backups.filter((b) => b.projectId === projectId && b.isCompleted);
    
    if (projectBackups.length <= maxAllowed) {
      return projectBackups.length;
    }
    
    const excessCount = projectBackups.length - maxAllowed;
    const sortedBackups = [...projectBackups].sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateA - dateB;
    });
    
    for (let i = 0; i < excessCount; i++) {
      const backup = sortedBackups[i];
      const index = backups.findIndex((b) => b.id === backup.id);
      if (index !== -1) {
        backups[index] = { ...backups[index], isCompleted: false, completedAt: null };
      }
    }
    
    safeSet(STORAGE_KEYS.backups, backups);
    return maxAllowed;
  },
};

export const missingStorage = {
  getAll(): MissingItem[] {
    return safeGet<MissingItem[]>(STORAGE_KEYS.missings, []);
  },

  getByProjectId(projectId: string): MissingItem[] {
    return this.getAll().filter((m) => m.projectId === projectId);
  },

  create(item: Omit<MissingItem, 'id' | 'createdAt'>): MissingItem {
    const items = this.getAll();
    const newItem: MissingItem = {
      ...item,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    safeSet(STORAGE_KEYS.missings, items);
    return newItem;
  },

  update(id: string, updates: Partial<MissingItem>): MissingItem | undefined {
    const items = this.getAll();
    const index = items.findIndex((m) => m.id === id);
    if (index === -1) return undefined;
    items[index] = { ...items[index], ...updates };
    safeSet(STORAGE_KEYS.missings, items);
    return items[index];
  },

  delete(id: string): boolean {
    const items = this.getAll();
    const filtered = items.filter((m) => m.id !== id);
    if (filtered.length === items.length) return false;
    safeSet(STORAGE_KEYS.missings, filtered);
    return true;
  },

  deleteByProjectId(projectId: string): void {
    const items = this.getAll();
    const filtered = items.filter((m) => m.projectId !== projectId);
    safeSet(STORAGE_KEYS.missings, filtered);
  },
};

export const statusLogStorage = {
  getAll(): StatusLog[] {
    return safeGet<StatusLog[]>(STORAGE_KEYS.statusLogs, []);
  },

  getByProjectId(projectId: string): StatusLog[] {
    return this.getAll()
      .filter((l) => l.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  create(log: Omit<StatusLog, 'id'>): StatusLog {
    const logs = this.getAll();
    const newLog: StatusLog = {
      ...log,
      id: generateId(),
    };
    logs.push(newLog);
    safeSet(STORAGE_KEYS.statusLogs, logs);
    return newLog;
  },

  deleteByProjectId(projectId: string): void {
    const logs = this.getAll();
    const filtered = logs.filter((l) => l.projectId !== projectId);
    safeSet(STORAGE_KEYS.statusLogs, filtered);
  },
};

export const activityLogStorage = {
  getAll(): ActivityLog[] {
    return safeGet<ActivityLog[]>(STORAGE_KEYS.activityLogs, []);
  },

  getByProjectId(projectId: string): ActivityLog[] {
    return this.getAll()
      .filter((l) => l.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  create(log: Omit<ActivityLog, 'id'>): ActivityLog {
    const logs = this.getAll();
    const newLog: ActivityLog = {
      ...log,
      id: generateId(),
    };
    logs.push(newLog);
    safeSet(STORAGE_KEYS.activityLogs, logs);
    return newLog;
  },

  deleteByProjectId(projectId: string): void {
    const logs = this.getAll();
    const filtered = logs.filter((l) => l.projectId !== projectId);
    safeSet(STORAGE_KEYS.activityLogs, filtered);
  },
};

export function logActivity(
  projectId: string,
  type: ActivityType,
  description: string,
  details?: Record<string, unknown>,
  operator?: string
): ActivityLog {
  return activityLogStorage.create({
    projectId,
    type,
    description,
    details,
    timestamp: new Date().toISOString(),
    operator,
  });
}

export const templateStorage = {
  getAll(): HandoverTemplate[] {
    return safeGet<HandoverTemplate[]>(STORAGE_KEYS.templates, []);
  },

  getById(id: string): HandoverTemplate | undefined {
    const templates = this.getAll();
    return templates.find((t) => t.id === id);
  },

  create(template: Omit<HandoverTemplate, 'id' | 'createdAt' | 'updatedAt'>): HandoverTemplate {
    const templates = this.getAll();
    const newTemplate: HandoverTemplate = {
      ...template,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (newTemplate.isDefault) {
      templates.forEach((t) => (t.isDefault = false));
    }
    templates.push(newTemplate);
    safeSet(STORAGE_KEYS.templates, templates);
    return newTemplate;
  },

  update(
    id: string,
    updates: Partial<HandoverTemplate>,
    syncToProjects: boolean = true
  ): HandoverTemplate | undefined {
    const templates = this.getAll();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    const oldTemplate = { ...templates[index] };
    if (updates.isDefault) {
      templates.forEach((t) => (t.isDefault = false));
    }
    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    safeSet(STORAGE_KEYS.templates, templates);
    const updatedTemplate = templates[index];

    if (syncToProjects) {
      this.syncToLinkedProjects(updatedTemplate, oldTemplate);
    }

    return updatedTemplate;
  },

  syncToLinkedProjects(
    updatedTemplate: HandoverTemplate,
    oldTemplate?: HandoverTemplate
  ): void {
    const allProjects = projectStorage.getAll();
    const linkedProjects = allProjects.filter((p) => p.templateId === updatedTemplate.id);

    for (const project of linkedProjects) {
      const existingCards = cardStorage.getByProjectId(project.id);
      const existingBackups = backupStorage.getByProjectId(project.id);
      const existingMissings = missingStorage.getByProjectId(project.id);

      let cardChanges = '';
      let backupChanges = '';
      let missingChanges = '';
      let noteChanged = false;

      if (
        !oldTemplate ||
        JSON.stringify(oldTemplate.storageCards) !==
          JSON.stringify(updatedTemplate.storageCards)
      ) {
        const unrecoveredCards = existingCards.filter((c) => !c.isRecovered);
        for (const c of unrecoveredCards) {
          cardStorage.delete(c.id);
        }
        const newCards: StorageCard[] = [];
        for (const tplCard of updatedTemplate.storageCards) {
          const matchingExisting = existingCards.find(
            (c) =>
              c.isRecovered &&
              c.cardLabel === tplCard.cardLabel &&
              c.deviceType === tplCard.deviceType
          );
          if (!matchingExisting) {
            newCards.push(
              cardStorage.create({
                projectId: project.id,
                cardLabel: tplCard.cardLabel,
                deviceType: tplCard.deviceType,
                deviceName: tplCard.deviceName,
                capacity: tplCard.capacity,
                isRecovered: false,
                recoveredAt: null,
              })
            );
          }
        }
        const allProjectCards = cardStorage.getByProjectId(project.id);
        projectStorage.update(project.id, { cardCount: allProjectCards.length });
        cardChanges = `存储卡：删除 ${unrecoveredCards.length} 张未回收卡，新增 ${newCards.length} 张，现共 ${allProjectCards.length} 张`;
      }

      if (
        !oldTemplate ||
        JSON.stringify(oldTemplate.backupLocations) !==
          JSON.stringify(updatedTemplate.backupLocations)
      ) {
        const incompleteBackups = existingBackups.filter((b) => !b.isCompleted);
        for (const b of incompleteBackups) {
          backupStorage.delete(b.id);
        }
        const newBackups: BackupRecord[] = [];
        for (const tplBackup of updatedTemplate.backupLocations) {
          const matchingExisting = existingBackups.find(
            (b) =>
              b.isCompleted &&
              b.location === tplBackup.location &&
              b.locationType === tplBackup.locationType
          );
          if (!matchingExisting) {
            newBackups.push(
              backupStorage.create({
                projectId: project.id,
                location: tplBackup.location,
                locationType: tplBackup.locationType,
                isCompleted: false,
                completedAt: null,
                startedAt: null,
              })
            );
          }
        }
        backupChanges = `备份位置：删除 ${incompleteBackups.length} 个未完成位置，新增 ${newBackups.length} 个`;
      }

      if (
        !oldTemplate ||
        JSON.stringify(oldTemplate.missingItems) !==
          JSON.stringify(updatedTemplate.missingItems)
      ) {
        const unresolvedMissings = existingMissings.filter((m) => !m.isResolved);
        for (const m of unresolvedMissings) {
          missingStorage.delete(m.id);
        }
        const newMissings: MissingItem[] = [];
        for (const tplMissing of updatedTemplate.missingItems) {
          const matchingExisting = existingMissings.find(
            (m) =>
              m.isResolved &&
              m.description === tplMissing.description &&
              m.severity === tplMissing.severity
          );
          if (!matchingExisting) {
            newMissings.push(
              missingStorage.create({
                projectId: project.id,
                description: tplMissing.description,
                severity: tplMissing.severity,
                isResolved: false,
                resolution: '',
              })
            );
          }
        }
        missingChanges = `核对项：删除 ${unresolvedMissings.length} 项未解决，新增 ${newMissings.length} 项`;
      }

      if (!oldTemplate || oldTemplate.handoverNote !== updatedTemplate.handoverNote) {
        projectStorage.update(project.id, { handoverNote: updatedTemplate.handoverNote });
        noteChanged = true;
      }

      const now = new Date().toISOString();
      const updatedProject = projectStorage.getById(project.id);

      statusLogStorage.create({
        projectId: project.id,
        fromStatus: updatedProject?.handoverStatus || project.handoverStatus,
        toStatus: updatedProject?.handoverStatus || project.handoverStatus,
        remark: `模板「${updatedTemplate.name}」已更新并同步至项目。${cardChanges}；${backupChanges}；${missingChanges}${noteChanged ? '；交接备注已同步' : ''}`,
        timestamp: now,
      });

      const details: Record<string, unknown> = {
        templateId: updatedTemplate.id,
        templateName: updatedTemplate.name,
        cardChanges,
        backupChanges,
        missingChanges,
        handoverNoteChanged: noteChanged,
      };
      if (oldTemplate) {
        details.diff = {
          storageCards: {
            old: oldTemplate.storageCards.length,
            new: updatedTemplate.storageCards.length,
          },
          backupLocations: {
            old: oldTemplate.backupLocations.length,
            new: updatedTemplate.backupLocations.length,
          },
          missingItems: {
            old: oldTemplate.missingItems.length,
            new: updatedTemplate.missingItems.length,
          },
        };
      }

      activityLogStorage.create({
        projectId: project.id,
        type: 'project_edit',
        description: `同步模板「${updatedTemplate.name}」更新至项目：${cardChanges}；${backupChanges}；${missingChanges}${noteChanged ? '；交接备注已同步' : ''}`,
        details,
        timestamp: now,
      });
    }
  },

  delete(id: string, unlinkProjects: boolean = true): boolean {
    const templates = this.getAll();
    const filtered = templates.filter((t) => t.id !== id);
    if (filtered.length === templates.length) return false;
    safeSet(STORAGE_KEYS.templates, filtered);

    if (unlinkProjects) {
      const allProjects = projectStorage.getAll();
      const linkedProjects = allProjects.filter((p) => p.templateId === id);
      for (const project of linkedProjects) {
        projectStorage.update(project.id, { templateId: null });

        statusLogStorage.create({
          projectId: project.id,
          fromStatus: project.handoverStatus,
          toStatus: project.handoverStatus,
          remark: `关联的模板「${templates.find((t) => t.id === id)?.name || '已删除'}」已被删除，项目已解除模板关联`,
          timestamp: new Date().toISOString(),
        });

        activityLogStorage.create({
          projectId: project.id,
          type: 'project_edit',
          description: `关联的模板已被删除，项目已解除模板关联`,
          details: {
            templateId: id,
            templateName: templates.find((t) => t.id === id)?.name,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return true;
  },

  getDefault(): HandoverTemplate | undefined {
    const templates = this.getAll();
    return templates.find((t) => t.isDefault) || templates[0];
  },

  initDefaults(): HandoverTemplate[] {
    const existing = this.getAll();
    if (existing.length > 0) return existing;

    const defaultTemplates: Omit<HandoverTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: '常规婚礼',
        description: '单机位标准婚礼跟拍交接清单',
        icon: '💒',
        isDefault: true,
        storageCards: [
          { cardLabel: 'A卡', deviceType: 'camera', deviceName: '主相机', capacity: '128GB' },
          { cardLabel: 'B卡', deviceType: 'camera', deviceName: '主相机备卡', capacity: '128GB' },
          { cardLabel: '录音卡', deviceType: 'audio', deviceName: '录音设备', capacity: '32GB' },
        ],
        backupLocations: [
          { location: 'NAS存储', locationType: 'nas' },
          { location: '移动硬盘A', locationType: 'external_hdd' },
          { location: '移动硬盘B', locationType: 'external_hdd' },
        ],
        missingItems: [
          { description: '核对新郎迎亲环节素材是否完整', severity: 'high' },
          { description: '核对仪式全程素材是否完整', severity: 'high' },
          { description: '核对敬酒环节素材是否完整', severity: 'medium' },
        ],
        handoverNote: '所有素材已完整回收\n已完成双备份校验\n等待客户确认交接',
      },
      {
        name: '双机位婚礼',
        description: '双摄影师双机位婚礼跟拍交接清单',
        icon: '📸',
        isDefault: false,
        storageCards: [
          { cardLabel: '主摄影师A卡', deviceType: 'camera', deviceName: '主相机', capacity: '128GB' },
          { cardLabel: '主摄影师B卡', deviceType: 'camera', deviceName: '主相机备卡', capacity: '128GB' },
          { cardLabel: '副摄影师A卡', deviceType: 'camera', deviceName: '副相机', capacity: '128GB' },
          { cardLabel: '副摄影师B卡', deviceType: 'camera', deviceName: '副相机备卡', capacity: '128GB' },
          { cardLabel: '录音卡1', deviceType: 'audio', deviceName: '主录音设备', capacity: '32GB' },
          { cardLabel: '录音卡2', deviceType: 'audio', deviceName: '备录音设备', capacity: '32GB' },
        ],
        backupLocations: [
          { location: 'NAS存储', locationType: 'nas' },
          { location: '移动硬盘A', locationType: 'external_hdd' },
          { location: '移动硬盘B', locationType: 'external_hdd' },
          { location: '云端备份', locationType: 'cloud' },
        ],
        missingItems: [
          { description: '核对主摄影师迎亲环节素材', severity: 'high' },
          { description: '核对副摄影师迎亲环节素材', severity: 'high' },
          { description: '核对主摄影师仪式全程素材', severity: 'high' },
          { description: '核对副摄影师仪式全程素材', severity: 'high' },
          { description: '核对双机位敬酒环节素材是否完整', severity: 'medium' },
          { description: '核对录音设备双备份音频', severity: 'medium' },
        ],
        handoverNote: '双机位素材已完整回收\n已完成三备份（NAS+双硬盘+云端）\n请后期团队注意素材整理编号',
      },
      {
        name: '含无人机婚礼',
        description: '含无人机航拍的婚礼跟拍交接清单',
        icon: '🚁',
        isDefault: false,
        storageCards: [
          { cardLabel: '相机A卡', deviceType: 'camera', deviceName: '主相机', capacity: '128GB' },
          { cardLabel: '相机B卡', deviceType: 'camera', deviceName: '主相机备卡', capacity: '128GB' },
          { cardLabel: '无人机TF卡', deviceType: 'drone', deviceName: '航拍无人机', capacity: '64GB' },
          { cardLabel: '录音卡', deviceType: 'audio', deviceName: '录音设备', capacity: '32GB' },
        ],
        backupLocations: [
          { location: 'NAS存储', locationType: 'nas' },
          { location: '移动硬盘A', locationType: 'external_hdd' },
          { location: '移动硬盘B', locationType: 'external_hdd' },
        ],
        missingItems: [
          { description: '核对迎亲航拍素材是否完整', severity: 'high' },
          { description: '核对仪式航拍素材是否完整', severity: 'high' },
          { description: '核对外景航拍素材是否完整', severity: 'medium' },
          { description: '核对地面拍摄素材是否完整', severity: 'high' },
          { description: '核对无人机电池及配件是否归还', severity: 'low' },
        ],
        handoverNote: '航拍+地面素材已完整回收\n航拍素材单独文件夹存放\n无人机电池已充电归还',
      },
    ];

    const created: HandoverTemplate[] = [];
    for (const tpl of defaultTemplates) {
      created.push(this.create(tpl));
    }
    return created;
  },
};

export function applyTemplateToProject(
  templateId: string,
  projectId: string
): { cards: StorageCard[]; backups: BackupRecord[]; missings: MissingItem[] } {
  const template = templateStorage.getById(templateId);
  if (!template) {
    return { cards: [], backups: [], missings: [] };
  }

  const createdCards: StorageCard[] = [];
  const createdBackups: BackupRecord[] = [];
  const createdMissings: MissingItem[] = [];

  for (const card of template.storageCards) {
    createdCards.push(
      cardStorage.create({
        projectId,
        cardLabel: card.cardLabel,
        deviceType: card.deviceType,
        deviceName: card.deviceName,
        capacity: card.capacity,
        isRecovered: false,
        recoveredAt: null,
      })
    );
  }

  for (const backup of template.backupLocations) {
    createdBackups.push(
      backupStorage.create({
        projectId,
        location: backup.location,
        locationType: backup.locationType,
        isCompleted: false,
        completedAt: null,
        startedAt: null,
      })
    );
  }

  for (const missing of template.missingItems) {
    createdMissings.push(
      missingStorage.create({
        projectId,
        description: missing.description,
        severity: missing.severity,
        isResolved: false,
        resolution: '',
      })
    );
  }

  const project = projectStorage.getById(projectId);
  if (project) {
    projectStorage.update(projectId, {
      handoverNote: template.handoverNote,
      cardCount: createdCards.length,
    });
  }

  return { cards: createdCards, backups: createdBackups, missings: createdMissings };
}
