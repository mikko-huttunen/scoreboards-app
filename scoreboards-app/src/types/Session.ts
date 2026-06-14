export type Session = {
  id: string;
  scoreboardId: string;
  scoreboardName: string;
  createdByName: string;
  isPending: boolean;
  participants: Set<string>;
  pointCategories: Set<string>;
  resultEntries: Set<string>;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const Session = {
  create: (data: Session): Session => ({
    id: data.id ?? '',
    scoreboardId: data.scoreboardId ?? '',
    scoreboardName: data.scoreboardName ?? '',
    createdByName: data.createdByName ?? '',
    isPending: data.isPending ?? false,
    participants: data.participants ?? new Set(),
    pointCategories: data.pointCategories ?? new Set(),
    resultEntries: data.resultEntries ?? new Set(),
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdBy: data.createdBy ?? '',
    isActive: data.isActive ?? true,
  }),
};
