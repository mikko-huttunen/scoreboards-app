export type Result = {
  pointCategoryId: string;
  points: number;
};

export const Result = {
  create: (data: Result): Result => ({
    pointCategoryId: data.pointCategoryId ?? '',
    points: data.points ?? 0,
  }),
};
