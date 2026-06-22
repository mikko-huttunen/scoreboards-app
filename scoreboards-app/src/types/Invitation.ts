import { PERMISSIONS } from '../constants.ts';

export type Invitation = {
  id: string;
  receiverId: string;
  receiverName: string;
  createdByName: string;
  scoreboardId: string;
  scoreboardName: string;
  permissions: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][];
  isPending: boolean;
  acceptedDate: string;
  created: string;
  lastModified: string;
  createdBy: string;
  isActive: boolean;
};

export const Invitation = {
  create: (data: Invitation): Invitation => ({
    id: data.id ?? '',
    receiverId: data.receiverId ?? '',
    receiverName: data.receiverName ?? '',
    createdByName: data.createdByName ?? '',
    scoreboardId: data.scoreboardId ?? '',
    scoreboardName: data.scoreboardName ?? '',
    permissions: data.permissions ?? [],
    isPending: data.isPending ?? true,
    acceptedDate: data.acceptedDate ?? '',
    created: data.created ?? '',
    lastModified: data.lastModified ?? '',
    createdBy: data.createdBy ?? '',
    isActive: data.isActive ?? true,
  }),
};
