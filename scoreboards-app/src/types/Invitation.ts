import { PERMISSIONS } from '../constants.ts';

export type Invitation = {
  id: string;
  type: string;
  receiverId: string;
  receiverName: string;
  inviterName: string;
  scoreboardId: string;
  scoreboardName: string;
  permissions: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][];
  acceptedDate: string | null;
  created: string;
  lastModified: string;
  createdBy: string;
  isActive: boolean;
};

export const Invitation = {
  create: (data: Invitation): Invitation => ({
    id: data.id,
    type: data.type,
    receiverId: data.receiverId,
    receiverName: data.receiverName,
    inviterName: data.inviterName,
    scoreboardId: data.scoreboardId,
    scoreboardName: data.scoreboardName,
    permissions: data.permissions ?? [],
    acceptedDate: data.acceptedDate,
    created: data.created,
    lastModified: data.lastModified,
    createdBy: data.createdBy,
    isActive: data.isActive,
  }),
};
