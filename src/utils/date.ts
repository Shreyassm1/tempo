import { format, isToday, isTomorrow, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDeadline(isoString: string | null): string {
  if (!isoString) return 'Not scheduled';
  try {
    const date = parseISO(isoString);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    }
    return format(date, 'EEE, MMM d • h:mm a');
  } catch {
    return isoString;
  }
}

export function formatRelativeDeadline(isoString: string | null): { text: string; isPast: boolean } {
  if (!isoString) return { text: 'Unscheduled', isPast: false };
  try {
    const date = parseISO(isoString);
    const now = new Date();
    const isPast = date.getTime() < now.getTime();
    const distance = formatDistanceToNow(date, { addSuffix: true });
    return { text: distance, isPast };
  } catch {
    return { text: isoString, isPast: false };
  }
}

export function checkBreach(deadlineIso: string | null, hardDueIso: string | null): boolean {
  if (!deadlineIso || !hardDueIso) return false;
  try {
    const deadline = parseISO(deadlineIso).getTime();
    const hardDue = parseISO(hardDueIso).getTime();
    return deadline > hardDue;
  } catch {
    return false;
  }
}
