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
  memberships: Membership[],
  userId: string | undefined
): boolean => {
  if (!userId) return false;

  const userPermissions = memberships.find(
    (ms) => ms.userId === userId
  )?.permissions;

  return userPermissions?.includes('OWNER') || false;
};

export const hasSessionsPermission = (
  memberships: Membership[],
  userId: string | undefined
): boolean => {
  if (!userId) return false;
  if (!memberships || memberships.length === 0) return false;

  const userPermissions = memberships.find(
    (ms) => ms.userId === userId
  )?.permissions;

  if (userPermissions?.includes('OWNER')) return true;

  return userPermissions?.includes('SESSIONS') || false;
};
