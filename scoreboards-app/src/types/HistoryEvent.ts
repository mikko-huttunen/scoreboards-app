import type { HistoryAction } from './HistoryAction.ts';

export type HistoryEventDetailsValue = [unknown, unknown] | unknown;

export type HistoryEvent = {
  id: string;
  scoreboardId: string;
  action: HistoryAction;
  entity: string;
  entityId: string;
  entityName: string;
  details: Record<string, HistoryEventDetailsValue>;
  createdByName: string;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const HistoryEvent = {
  create: (data: HistoryEvent): HistoryEvent => ({
    id: data.id,
    scoreboardId: data.scoreboardId,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId,
    entityName: data.entityName,
    details: data.details,
    createdByName: data.createdByName,
    created: data.created,
    lastModified: data.lastModified,
    createdBy: data.createdBy,
    isActive: data.isActive,
  }),
};
