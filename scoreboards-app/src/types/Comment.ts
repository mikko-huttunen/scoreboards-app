export type Comment = {
  id: string;
  type: string;
  scoreboardId: string;
  userId: string;
  // Resolved server-side at creation, may be null once the user is removed
  username?: string | null;
  avatar?: string | null;
  sessionId?: string | null;
  comment: string;
  created: Date;
  lastModified: Date;
  // Omitted by the backend when null (@JsonInclude NON_NULL)
  createdBy?: string;
  isActive: boolean;
};

export const Comment = {
  create: (data: Comment): Comment => ({
    id: data.id,
    type: data.type,
    scoreboardId: data.scoreboardId,
    userId: data.userId,
    username: data.username ?? null,
    avatar: data.avatar ?? null,
    sessionId: data.sessionId ?? null,
    comment: data.comment,
    created: data.created,
    lastModified: data.lastModified,
    createdBy: data.createdBy,
    isActive: data.isActive,
  }),
};
