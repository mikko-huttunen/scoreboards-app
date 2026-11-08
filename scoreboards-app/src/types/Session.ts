export type Session = {
  id: string;
  name: string;
  description: string;
  type: string;
  scoreboardId: string;
  createdByName: string;
  isPending: boolean;
  finishedAt: Date | null;
  // Set once a finished session is edited, null while it has never been edited post-finish
  editedAt?: Date | null;
  participants: Set<string>;
  pointCategories: Set<string>;
  resultEntries: Set<string>;
  isTieResolved?: boolean;
  tieWinner?: string | null;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const Session = {
  create: (data: Session): Session => ({
    id: data.id,
    name: data.name,
    description: data.description,
    type: data.type,
    scoreboardId: data.scoreboardId,
    createdByName: data.createdByName,
    isPending: data.isPending,
    finishedAt: data.finishedAt ?? null,
    editedAt: data.editedAt ?? null,
    participants: data.participants,
    pointCategories: data.pointCategories,
    resultEntries: data.resultEntries,
    isTieResolved: data.isTieResolved ?? true,
    tieWinner: data.tieWinner ?? null,
    created: data.created,
    lastModified: data.lastModified,
    createdBy: data.createdBy,
    isActive: data.isActive,
  }),
};
