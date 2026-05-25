export type Result = {
  id: string;
  created: Date;
  scoreboardId: string;
  sessionId: string;
  resultEntryId: string;
  userId: string;
  pointCategoryId: string;
  points: number; // double
  isActive: boolean;
};

export const Result = {
  create: (data: Partial<Result>): Result => ({
    id: data.id ?? "",
    created: data.created ?? new Date(),
    scoreboardId: data.scoreboardId ?? "",
    sessionId: data.sessionId ?? "",
    resultEntryId: data.resultEntryId ?? "",
    userId: data.userId ?? "",
    pointCategoryId: data.pointCategoryId ?? "",
    points: data.points ?? 0,
    isActive: data.isActive ?? true,
  }),
};


