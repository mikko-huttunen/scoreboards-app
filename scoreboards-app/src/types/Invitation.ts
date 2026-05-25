export type Invitation = {
    id: string;
    created: Date;
    createdBy: string;
    receiver: string;
    scoreboardId: string;
    scoreboardName: string;
    isPending: boolean;
    acceptedDate: Date;
    isActive: boolean;
};

export const Invitation = {
    create: (data: Partial<Invitation>): Invitation => ({
        id: data.id ?? "",
        created: data.created ?? new Date(),
        createdBy: data.createdBy ?? "",
        receiver: data.receiver ?? "",
        scoreboardId: data.scoreboardId ?? "",
        scoreboardName: data.scoreboardName ?? "",
        isPending: data.isPending ?? true,
        acceptedDate: data.acceptedDate ?? new Date(),
        isActive: data.isActive ?? true,
    }),
};