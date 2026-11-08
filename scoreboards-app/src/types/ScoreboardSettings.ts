import { STAT_TYPES } from '../constants.ts';

export type ScoreboardSettings = {
  statTypes: (typeof STAT_TYPES)[keyof typeof STAT_TYPES][];
  defaultStatType: (typeof STAT_TYPES)[keyof typeof STAT_TYPES];
};

export const ScoreboardSettings = {
  create: (data: ScoreboardSettings): ScoreboardSettings => ({
    statTypes: data.statTypes,
    defaultStatType: data.defaultStatType,
  }),
};
