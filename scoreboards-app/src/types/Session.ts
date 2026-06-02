export type Session = {
  id: string;
  scoreboardId: string;
  scoreboardName: string;
  isPending: boolean;
  participants: Set<string>;
  pointCategories: Set<string>;
  resultEntries: Set<string>;
  created: Date;
  lastModified: Date;
  createdById: string;
  isActive: boolean;
};

export const Session = {
  create: (data: Session): Session => ({
    id: data.id ?? '',
    scoreboardId: data.scoreboardId ?? '',
    scoreboardName: data.scoreboardName ?? '',
    isPending: data.isPending ?? false,
    participants: data.participants ?? new Set(),
    pointCategories: data.pointCategories ?? new Set(),
    resultEntries: data.resultEntries ?? new Set(),
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdById: data.createdById ?? '',
    isActive: data.isActive ?? true,
  }),
};
