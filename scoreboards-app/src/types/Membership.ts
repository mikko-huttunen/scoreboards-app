import { PERMISSIONS } from '../constants.ts';

export type Membership = {
  scoreboardId: string;
  userId: string;
  permissions: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][];
};

export const Membership = {
  create: (data: Membership): Membership => ({
    scoreboardId: data.scoreboardId ?? '',
    userId: data.userId ?? '',
    permissions: data.permissions ?? [],
  }),
};
