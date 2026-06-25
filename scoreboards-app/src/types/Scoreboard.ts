import type { Membership } from './Membership.ts';

export type Scoreboard = {
  id: string;
  type: string;
  name: string;
  memberships: Set<Membership>;
  pointCategories: Set<string>;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const Scoreboard = {
  create: (data: Scoreboard): Scoreboard => ({
    id: data.id ?? '',
    type: data.type ?? '',
    name: data.name ?? '',
    memberships: data.memberships ?? new Set(),
    pointCategories: data.pointCategories ?? new Set(),
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdBy: data.createdBy ?? '',
    isActive: data.isActive ?? true,
  }),
};
