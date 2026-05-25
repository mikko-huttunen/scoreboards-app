import type { User } from './User';
import type { PointCategory } from './PointCategory';
import type { ResultEntry } from './ResultEntry';

export type Session = {
  id: string;
  created: Date;
  createdById: string;
  scoreboardId: string;
  scoreboardName: string;
  isPending: boolean;
  participants: Set<User>;
  pointCategories: Set<PointCategory>;
  resultEntries: Set<ResultEntry>;
  isActive: boolean;
};

export const Session = {
  create: (data: Partial<Session>): Session => ({
    id: data.id ?? '',
    created: data.created ?? new Date(),
    createdById: data.createdById ?? '',
    scoreboardId: data.scoreboardId ?? '',
    scoreboardName: data.scoreboardName ?? '',
    isPending: data.isPending ?? false,
    participants: data.participants ?? new Set(),
    pointCategories: data.pointCategories ?? new Set(),
    resultEntries: data.resultEntries ?? new Set(),
    isActive: data.isActive ?? true,
  }),
};
