export type Invitation = {
  id: string;
  receiverId: string;
  scoreboardId: string;
  scoreboardName: string;
  isPending: boolean;
  acceptedDate: Date;
  created: Date;
  lastModified: Date;
  createdBy: string;
  isActive: boolean;
};

export const Invitation = {
  create: (data: Invitation): Invitation => ({
    id: data.id ?? '',
    receiverId: data.receiverId ?? '',
    scoreboardId: data.scoreboardId ?? '',
    scoreboardName: data.scoreboardName ?? '',
    isPending: data.isPending ?? true,
    acceptedDate: data.acceptedDate ?? new Date(),
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    createdBy: data.createdBy ?? '',
    isActive: data.isActive ?? true,
  }),
};
