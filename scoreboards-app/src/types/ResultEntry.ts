import type { Result } from './Result';

export type ResultEntry = {
  id: string;
  created: Date;
  scoreboardId: string;
  sessionId: string;
  userId: string;
  results: Set<Result>;
  totalPoints: number;
  isActive: boolean;
};

export const ResultEntry = {
  create: (data: Partial<ResultEntry>): ResultEntry => ({
    id: data.id ?? '',
    created: data.created ?? new Date(),
    scoreboardId: data.scoreboardId ?? '',
    sessionId: data.sessionId ?? '',
    userId: data.userId ?? '',
    results: data.results ?? new Set(),
    totalPoints: data.totalPoints ?? 0,
    isActive: data.isActive ?? true,
  }),
};
