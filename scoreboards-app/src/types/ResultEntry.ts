import type { Result } from './Result.ts';

export type ResultEntry = {
  id: string;
  scoreboardId: string;
  sessionId: string;
  userId: string;
  isPending: boolean;
  results: Set<Result>;
  totalPoints: number;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const ResultEntry = {
  create: (data: ResultEntry): ResultEntry => ({
    id: data.id ?? '',
    scoreboardId: data.scoreboardId ?? '',
    sessionId: data.sessionId ?? '',
    userId: data.userId ?? '',
    isPending: data.isPending ?? true,
    results: data.results ?? new Set(),
    totalPoints: data.totalPoints ?? 0,
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdBy: data.createdBy ?? '',
    isActive: data.isActive ?? true,
  }),
};
