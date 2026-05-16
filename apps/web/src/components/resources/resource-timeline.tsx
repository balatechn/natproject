'use client';

import { useMemo } from 'react';
import { eachDayOfInterval, format, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export interface ResourceRow {
  id: string;
  name: string;
  avatarInitial: string;
  role?: string;
  color?: string;
  /** Map of ISO date string → allocated hours */
  dailyHours: Record<string, number>;
  /** Total capacity per day (default 8) */
  capacity?: number;
}

interface ResourceTimelineProps {
  rows: ResourceRow[];
  viewStart: Date;
  viewEnd: Date;
  className?: string;
}

function utilColor(hours: number, capacity: number): string {
  if (hours === 0) return '';
  const ratio = hours / capacity;
  if (ratio <= 0.5) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  if (ratio <= 1.0) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
}

function utilBg(hours: number, capacity: number): string {
  if (hours === 0) return 'bg-muted/30';
  const ratio = hours / capacity;
  if (ratio <= 0.5) return 'bg-green-500/20 dark:bg-green-500/15';
  if (ratio <= 1.0) return 'bg-yellow-400/30 dark:bg-yellow-400/20';
  return 'bg-red-400/30 dark:bg-red-400/20';
}

export function ResourceTimeline({ rows, viewStart, viewEnd, className }: ResourceTimelineProps) {
  const today = startOfDay(new Date());
  const days = useMemo(
    () => eachDayOfInterval({ start: viewStart, end: viewEnd }),
    [viewStart, viewEnd]
  );

  const CELL_W = 44;
  const LABEL_W = 200;

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      {/* Header row */}
      <div className="flex sticky top-0 z-10 bg-muted/60 backdrop-blur-sm border-b">
        {/* Label column header */}
        <div
          className="shrink-0 border-r flex items-center px-3 py-2"
          style={{ width: LABEL_W }}
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resource</span>
        </div>
        {/* Day headers */}
        <div className="flex overflow-x-auto">
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'shrink-0 flex flex-col items-center justify-center py-1.5 border-r last:border-r-0 text-center',
                  isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/50' : ''
                )}
                style={{ width: CELL_W }}
              >
                <span className={cn('text-[9px] font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {format(day, 'EEE')}
                </span>
                <span
                  className={cn(
                    'text-xs font-bold leading-none mt-0.5',
                    isToday ? 'text-primary' : isWeekend ? 'text-muted-foreground/60' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month label row (above individual days) */}
      <div className="flex border-b bg-muted/30">
        <div className="shrink-0 border-r" style={{ width: LABEL_W }} />
        <div className="flex overflow-x-auto flex-1">
          {(() => {
            const groups: { label: string; count: number }[] = [];
            let current = '';
            let count = 0;
            days.forEach((d) => {
              const m = format(d, 'MMMM yyyy');
              if (m !== current) {
                if (current) groups.push({ label: current, count });
                current = m;
                count = 1;
              } else {
                count++;
              }
            });
            if (current) groups.push({ label: current, count });
            return groups.map((g, i) => (
              <div
                key={i}
                className="shrink-0 border-r last:border-r-0 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                style={{ width: g.count * CELL_W }}
              >
                {g.label}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Resource rows */}
      {rows.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">No resource data available</div>
      ) : (
        rows.map((row, rowIdx) => {
          const cap = row.capacity ?? 8;
          const totalHours = Object.values(row.dailyHours).reduce((s, h) => s + h, 0);
          const avgUtil = days.length > 0 ? (totalHours / (days.length * cap)) * 100 : 0;

          return (
            <div
              key={row.id}
              className={cn('flex border-b last:border-b-0', rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/10')}
            >
              {/* Resource label */}
              <div
                className="shrink-0 border-r flex items-center gap-2.5 px-3 py-2"
                style={{ width: LABEL_W }}
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: row.color ?? '#3b82f6' }}
                >
                  {row.avatarInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{row.name}</p>
                  {row.role && <p className="text-[10px] text-muted-foreground truncate">{row.role}</p>}
                </div>
                <div className="ml-auto shrink-0">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(avgUtil)}%</span>
                </div>
              </div>

              {/* Day cells */}
              <div className="flex overflow-x-auto flex-1">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const hours = row.dailyHours[key] ?? 0;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = isSameDay(day, today);

                  return (
                    <div
                      key={key}
                      className={cn(
                        'shrink-0 flex items-center justify-center border-r last:border-r-0 text-[10px] font-medium',
                        isToday ? 'ring-1 ring-inset ring-primary/30' : '',
                        isWeekend && hours === 0 ? 'bg-muted/40' : utilBg(hours, cap)
                      )}
                      style={{ width: CELL_W, height: 48 }}
                      title={`${row.name}: ${hours}h on ${format(day, 'MMM d')}`}
                    >
                      {hours > 0 ? (
                        <span className={cn('tabular-nums', utilColor(hours, cap))}>
                          {hours}h
                        </span>
                      ) : isWeekend ? (
                        <span className="text-muted-foreground/30 text-[8px]">—</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
        <span className="font-medium">Utilization:</span>
        {[
          { label: 'Available (≤50%)', cls: 'bg-green-500/20 border border-green-300/50' },
          { label: 'Busy (51–100%)', cls: 'bg-yellow-400/30 border border-yellow-300/50' },
          { label: 'Overloaded (>100%)', cls: 'bg-red-400/30 border border-red-300/50' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={cn('inline-block w-3 h-3 rounded-sm', l.cls)} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
