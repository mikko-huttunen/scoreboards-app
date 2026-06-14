import { format, parseISO } from 'date-fns';

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
