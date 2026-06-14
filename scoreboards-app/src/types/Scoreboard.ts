export type Scoreboard = {
  id: string;
  name: string;
  users: Set<string>;
  pointCategories: Set<string>;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const Scoreboard = {
  create: (data: Scoreboard): Scoreboard => ({
    id: data.id ?? '',
    name: data.name ?? '',
    users: data.users ?? new Set(),
    pointCategories: data.pointCategories ?? new Set(),
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdBy: data.createdBy ?? '',
    isActive: data.isActive ?? true,
  }),
};
