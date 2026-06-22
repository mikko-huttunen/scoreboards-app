export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  created: Date;
  lastModified: Date;
  isActive: boolean;
};

export const User = {
  create: (data: User): User => ({
    id: data.id ?? '',
    name: data.name ?? '',
    email: data.email ?? '',
    avatar: data.avatar ?? '',
    created: data.created ?? new Date(),
    lastModified: data.lastModified ?? new Date(),
    isActive: data.isActive ?? true,
  }),
};
