import type {
  WeddingProject,
  StorageCard,
  BackupRecord,
  MissingItem,
  StatusLog,
} from '~/types/project';

const STORAGE_KEYS = {
  projects: 'wedding_projects',
  cards: 'wedding_cards',
  backups: 'wedding_backups',
  missings: 'wedding_missings',
  statusLogs: 'wedding_status_logs',
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
