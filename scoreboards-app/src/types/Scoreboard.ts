import type { Membership } from './Membership.ts';
import type { PointCategory } from './PointCategory.ts';
import type { ResultEntry } from './ResultEntry.ts';
import type { Session } from './Session.ts';

export type Scoreboard = {
  id: string;
  type: string;
  name: string;
  memberships: Membership[];
  pointCategories: PointCategory[];
  sessions: Session[];
  resultEntries: ResultEntry[];
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const Scoreboard = {
  create: (data: Scoreboard): Scoreboard => ({
    id: data.id,
    type: data.type,
    name: data.name,
    memberships: data.memberships,
    pointCategories: data.pointCategories,
    sessions: data.sessions,
    resultEntries: data.resultEntries,
    created: data.created,
    lastModified: data.lastModified,
    createdBy: data.createdBy,
    isActive: data.isActive,
  }),
};
