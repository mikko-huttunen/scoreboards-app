export type PointCategory = {
  id: string;
  type: string;
  name: string;
  scoreboardId: string;
  color: string;
  created: Date;
  lastModified: Date;
  createdById: string;
  isActive: boolean;
};

export const PointCategory = {
  create: (data: PointCategory): PointCategory => ({
    id: data.id,
    type: data.type,
    name: data.name,
    scoreboardId: data.scoreboardId,
    color: data.color,
    created: data.created,
    lastModified: data.lastModified,
    createdById: data.createdById,
    isActive: data.isActive,
  }),
};
