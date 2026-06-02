export type Result = {
  id: string;
  scoreboardId: string;
  sessionId: string;
  resultEntryId: string;
  userId: string;
  pointCategoryId: string;
  points: number;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const Result = {
  create: (data: Result): Result => ({
    id: data.id ?? '',
    scoreboardId: data.scoreboardId ?? '',
    sessionId: data.sessionId ?? '',
    resultEntryId: data.resultEntryId ?? '',
    userId: data.userId ?? '',
    pointCategoryId: data.pointCategoryId ?? '',
    points: data.points ?? 0,
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdBy: data.createdBy ?? '',
    isActive: data.isActive ?? true,
  }),
};
