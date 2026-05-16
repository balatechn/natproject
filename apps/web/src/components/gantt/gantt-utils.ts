import {
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  isSameDay,
  isWithinInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns';

export type ZoomLevel = 'day' | 'week' | 'month';

export interface GanttTask {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  priority: string;
  status: string;
  isMilestone?: boolean;
  parentId?: string | null;
  color?: string;
  dependencies?: string[];
}

export interface GanttColumn {
  date: Date;
  label: string;
  subLabel?: string;
  width: number;
  isWeekend: boolean;
  isToday: boolean;
}

export const ZOOM_DAY_WIDTH: Record<ZoomLevel, number> = {
  day: 40,
  week: 18,
  month: 8,
};

export const TASK_ROW_HEIGHT = 40;
export const HEADER_HEIGHT = 56;
export const LABEL_WIDTH = 260;
export const MIN_TASK_WIDTH = 4;

export function buildColumns(viewStart: Date, viewEnd: Date, zoom: ZoomLevel): GanttColumn[] {
  const today = startOfDay(new Date());
  const cols: GanttColumn[] = [];
  const dayWidth = ZOOM_DAY_WIDTH[zoom];

  if (zoom === 'day') {
    const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
    for (const d of days) {
      const dow = d.getDay();
      cols.push({
        date: d,
        label: format(d, 'd'),
        subLabel: format(d, 'EEE'),
        width: dayWidth,
        isWeekend: dow === 0 || dow === 6,
        isToday: isSameDay(d, today),
      });
    }
  } else if (zoom === 'week') {
    const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
    for (const d of days) {
      const dow = d.getDay();
      cols.push({
        date: d,
        label: dow === 1 ? `W${format(d, 'w')}` : format(d, 'd'),
        width: dayWidth,
        isWeekend: dow === 0 || dow === 6,
        isToday: isSameDay(d, today),
      });
    }
  } else {
    const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
    for (const d of days) {
      const dow = d.getDay();
      cols.push({
        date: d,
        label: d.getDate() === 1 ? format(d, 'MMM') : String(d.getDate()),
        width: dayWidth,
        isWeekend: dow === 0 || dow === 6,
        isToday: isSameDay(d, today),
      });
    }
  }
  return cols;
}

export function dateToX(date: Date, viewStart: Date, zoom: ZoomLevel): number {
  const days = differenceInDays(startOfDay(date), startOfDay(viewStart));
  return days * ZOOM_DAY_WIDTH[zoom];
}

export function durationToWidth(start: Date, end: Date, zoom: ZoomLevel): number {
  const days = Math.max(differenceInDays(startOfDay(end), startOfDay(start)), 1);
  return Math.max(days * ZOOM_DAY_WIDTH[zoom], MIN_TASK_WIDTH);
}

export function getDefaultViewRange(tasks: GanttTask[]): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  const validDates = tasks
    .flatMap((t) => [t.startDate, t.endDate])
    .filter((d): d is Date => d != null);

  if (validDates.length === 0) {
    return { start: addDays(today, -7), end: addDays(today, 60) };
  }

  const min = validDates.reduce((a, b) => (a < b ? a : b));
  const max = validDates.reduce((a, b) => (a > b ? a : b));
  return {
    start: addDays(min, -3),
    end: addDays(max, 7),
  };
}

export const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#3b82f6',
  LOW: '#94a3b8',
  NONE: '#94a3b8',
};

export const STATUS_COLOR: Record<string, string> = {
  BACKLOG: '#94a3b8',
  TODO: '#6366f1',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#a855f7',
  DONE: '#16a34a',
  BLOCKED: '#ef4444',
};
