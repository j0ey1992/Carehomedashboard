import { format as formatDateFns, differenceInDays as differenceInDaysFns } from 'date-fns';

export const formatDate = (date: Date | string): string => {
  if (!date) return '-';
  return formatDateFns(new Date(date), 'dd/MM/yyyy');
};

export const formatDateTime = (date: Date | string): string => {
  if (!date) return '-';
  return formatDateFns(new Date(date), 'dd/MM/yyyy HH:mm');
};

export const differenceInDays = (dateLeft: Date | string, dateRight: Date | string): number => {
  return differenceInDaysFns(new Date(dateLeft), new Date(dateRight));
};

export const isExpiringSoon = (date: Date | string, daysThreshold: number = 30): boolean => {
  const days = differenceInDays(new Date(date), new Date());
  return days > 0 && days <= daysThreshold;
};

export const isExpired = (date: Date | string): boolean => {
  return differenceInDays(new Date(date), new Date()) <= 0;
};

export const getDaysUntilExpiry = (date: Date | string): number => {
  return differenceInDays(new Date(date), new Date());
};
