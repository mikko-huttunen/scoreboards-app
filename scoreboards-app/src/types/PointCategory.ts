export type PointCategory = {
  id: string;
  name: string;
  created: Date;
  lastModified: Date;
  createdById: string;
  scoreboardId: string;
  scoreboardName: string;
  color: string; // HEX or CSS color string
  isActive: boolean;
};

export const PointCategory = {
  create: (data: Partial<PointCategory>): PointCategory => ({
    id: data.id ?? "",
    name: data.name ?? "",
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdById: data.createdById ?? "",
    scoreboardId: data.scoreboardId ?? "",
    scoreboardName: data.scoreboardName ?? "",
    color: data.color ?? "#38a14f",
    isActive: data.isActive ?? true,
  }),
};


