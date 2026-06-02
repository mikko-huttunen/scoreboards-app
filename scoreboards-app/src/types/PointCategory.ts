export type PointCategory = {
  id: string;
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
    id: data.id ?? '',
    name: data.name ?? '',
    scoreboardId: data.scoreboardId ?? '',
    color: data.color ?? '#38a14f',
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdById: data.createdById ?? '',
    isActive: data.isActive ?? true,
  }),
};
