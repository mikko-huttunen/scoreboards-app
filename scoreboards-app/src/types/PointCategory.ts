export type PointCategory = {
  id: string;
  type: string;
  name: string;
  index: number;
  scoreboardId: string;
  color: string;
  created: Date;
  lastModified: Date;
  createdById: string;
  isActive: boolean;
};

/**
 * Order point categories the way the scoreboard defines them.
 *
 * `index` is the position the scoreboard owner gave the category, and it drives the order
 * everywhere the categories show up: forms, score entry, chart segments and legends. The sort is
 * applied to a copy and is stable, so categories sharing an index keep their incoming order.
 */
export const sortPointCategoriesByIndex = <T extends { index?: number }>(
  pointCategories: T[]
): T[] => [...pointCategories].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

export const PointCategory = {
  create: (data: PointCategory): PointCategory => ({
    id: data.id,
    type: data.type,
    name: data.name,
    index: data.index,
    scoreboardId: data.scoreboardId,
    color: data.color,
    created: data.created,
    lastModified: data.lastModified,
    createdById: data.createdById,
    isActive: data.isActive,
  }),
};
