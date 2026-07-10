export type Session = {
  id: string;
  name: string;
  comment: string;
  type: string;
  scoreboardId: string;
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
    id: data.id,
    name: data.name,
    comment: data.comment,
    type: data.type,
    scoreboardId: data.scoreboardId,
    createdByName: data.createdByName,
    isPending: data.isPending,
    participants: data.participants,
    pointCategories: data.pointCategories,
    resultEntries: data.resultEntries,
    created: data.created,
    lastModified: data.lastModified,
    createdBy: data.createdBy,
    isActive: data.isActive,
  }),
};
