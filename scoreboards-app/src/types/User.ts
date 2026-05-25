export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string; // URL to avatar image
  created: Date;
  lastModified: Date;
  scoreboards: string[];
  notifications: string[];
  isActive: boolean;
};

export const User = {
  create: (data: Partial<User>): User => ({
    id: data.id ?? '',
    name: data.name ?? '',
    email: data.email ?? '',
    avatar: data.avatar ?? '',
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    scoreboards: data.scoreboards ?? [],
    notifications: data.notifications ?? [],
    isActive: data.isActive ?? true,
  }),
};
