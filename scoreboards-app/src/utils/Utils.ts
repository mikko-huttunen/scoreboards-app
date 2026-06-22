import { format, parseISO } from 'date-fns';
import type { Membership } from '../types/Membership.ts';

const FORMATS = {
  DATE: 'd/M/yyyy',
  DATETIME: 'd/M/yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ssXXX",
};

// Derive the type for keys directly from the FORMATS object
export type FormatKey = keyof typeof FORMATS;

export const useDateFormat = () => {
  const format_date = (
    date: string | Date | null | undefined,
    type: FormatKey = 'DATETIME'
  ): string => {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    // Safe access using the FormatKey type
    return format(dateObj, FORMATS[type] || FORMATS.DATETIME);
  };

  return { format_date };
};

export const isOwner = (
  members: Set<Membership>,
  userId: string | undefined
): boolean => {
  if (!userId) return false;

  const userPermissions = Array.from(members).find(
    (member) => member.userId === userId
  )?.permissions;

  return userPermissions?.includes('OWNER') || false;
};

export const hasMembersPermission = (
  members: Set<Membership>,
  userId: string | undefined
): boolean => {
  if (!userId) return false;

  const userPermissions = Array.from(members).find(
    (member) => member.userId === userId
  )?.permissions;

  if (userPermissions?.includes('OWNER')) return true;

  return userPermissions?.includes('MEMBERS') || false;
};

export const hasSessionsPermission = (
  members: Set<Membership>,
  userId: string | undefined
): boolean => {
  if (!userId) return false;
  if (!members || members.size === 0) return false;

  const userPermissions = Array.from(members).find(
    (member) => member.userId === userId
  )?.permissions;

  if (userPermissions?.includes('OWNER')) return true;

  return userPermissions?.includes('SESSIONS') || false;
};
