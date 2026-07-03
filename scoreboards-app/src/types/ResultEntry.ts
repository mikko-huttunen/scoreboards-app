import type { Result } from './Result.ts';

export type ResultEntry = {
  id: string;
  type: string;
  scoreboardId: string;
  sessionId: string;
  userId: string;
  isPending: boolean;
  results: Result[];
  totalPoints: number;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const ResultEntry = {
  create: (data: ResultEntry): ResultEntry => ({
    id: data.id,
    type: data.type,
    scoreboardId: data.scoreboardId,
    sessionId: data.sessionId,
    userId: data.userId,
    isPending: data.isPending,
    results: data.results,
    totalPoints: data.totalPoints,
    created: data.created,
    lastModified: data.lastModified,
    createdBy: data.createdBy,
    isActive: data.isActive,
  }),
};
