export type Scoreboard = {
  id: string;
  name: string;
  created: Date; // ISO timestamp
  lastModified: Date; // ISO timestamp
  createdBy: string; // Matches backend Auditable.createdBy field
  participants: string[];
  pointCategories: string[];
  sessions: string[];
  settings: Map<string, unknown>;
  isActive: boolean;
};

export const Scoreboard = {
  create: (data: Partial<Scoreboard>): Scoreboard => ({
    id: data.id ?? "",
    name: data.name ?? "",
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdBy: data.createdBy ?? "",
    participants: data.participants ?? [],
    pointCategories: data.pointCategories ?? [],
    sessions: data.sessions ?? [],
    settings: data.settings ?? new Map(),
    isActive: data.isActive ?? true,
  }),
};


