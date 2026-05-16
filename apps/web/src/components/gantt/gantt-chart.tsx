'use client';

import React, { useCallback, useRef, useState, useMemo } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  buildColumns,
  dateToX,
  durationToWidth,
  getDefaultViewRange,
  GanttTask,
  HEADER_HEIGHT,
  LABEL_WIDTH,
  PRIORITY_COLOR,
  STATUS_COLOR,
  TASK_ROW_HEIGHT,
  ZOOM_DAY_WIDTH,
  ZoomLevel,
} from './gantt-utils';

interface GanttChartProps {
  tasks: GanttTask[];
  zoom: ZoomLevel;
  viewStart: Date;
  viewEnd: Date;
  onTaskClick?: (task: GanttTask) => void;
  onTaskReschedule?: (taskId: string, newStart: Date, newEnd: Date) => void;
  className?: string;
}

const MILESTONE_SIZE = 12;

export function GanttChart({
  tasks,
  zoom,
  viewStart,
  viewEnd,
  onTaskClick,
  onTaskReschedule,
  className,
}: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    taskId: string;
    startX: number;
    origStart: Date;
    origEnd: Date;
    dayWidth: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const columns = useMemo(() => buildColumns(viewStart, viewEnd, zoom), [viewStart, viewEnd, zoom]);
  const totalWidth = columns.length * ZOOM_DAY_WIDTH[zoom];
  const totalHeight = HEADER_HEIGHT + tasks.length * TASK_ROW_HEIGHT;
  const dayWidth = ZOOM_DAY_WIDTH[zoom];
  const today = startOfDay(new Date());

  // Group header labels (month/week markers shown above individual day cells)
  const groupedHeaders = useMemo(() => {
    if (zoom === 'day') {
      // Group by month
      const groups: { label: string; x: number; width: number }[] = [];
      let current = '';
      let startX = 0;
      let w = 0;
      columns.forEach((col, i) => {
        const m = format(col.date, 'MMMM yyyy');
        if (m !== current) {
          if (current) groups.push({ label: current, x: startX, width: w });
          current = m;
          startX = i * dayWidth;
          w = dayWidth;
        } else {
          w += dayWidth;
        }
      });
      if (current) groups.push({ label: current, x: startX, width: w });
      return groups;
    } else if (zoom === 'week') {
      // Group by month
      const groups: { label: string; x: number; width: number }[] = [];
      let current = '';
      let startX = 0;
      let w = 0;
      columns.forEach((col, i) => {
        const m = format(col.date, 'MMM yyyy');
        if (m !== current) {
          if (current) groups.push({ label: current, x: startX, width: w });
          current = m;
          startX = i * dayWidth;
          w = dayWidth;
        } else {
          w += dayWidth;
        }
      });
      if (current) groups.push({ label: current, x: startX, width: w });
      return groups;
    }
    // month zoom — group by year
    const groups: { label: string; x: number; width: number }[] = [];
    let current = '';
    let startX = 0;
    let w = 0;
    columns.forEach((col, i) => {
      const y = format(col.date, 'yyyy');
      if (y !== current) {
        if (current) groups.push({ label: current, x: startX, width: w });
        current = y;
        startX = i * dayWidth;
        w = dayWidth;
      } else {
        w += dayWidth;
      }
    });
    if (current) groups.push({ label: current, x: startX, width: w });
    return groups;
  }, [columns, zoom, dayWidth]);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, task: GanttTask) => {
      if (!task.startDate || !task.endDate || !onTaskReschedule) return;
      e.preventDefault();
      setDragging({
        taskId: task.id,
        startX: e.clientX,
        origStart: task.startDate,
        origEnd: task.endDate,
        dayWidth,
      });
      setDragOffset(0);
    },
    [dayWidth, onTaskReschedule]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const delta = e.clientX - dragging.startX;
      setDragOffset(delta);
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragging || !onTaskReschedule) return;
    const deltaDays = Math.round(dragOffset / dragging.dayWidth);
    if (deltaDays !== 0) {
      const newStart = addDays(dragging.origStart, deltaDays);
      const newEnd = addDays(dragging.origEnd, deltaDays);
      onTaskReschedule(dragging.taskId, newStart, newEnd);
    }
    setDragging(null);
    setDragOffset(0);
  }, [dragging, dragOffset, onTaskReschedule]);

  const todayX = dateToX(today, viewStart, zoom);

  return (
    <div
      className={cn('flex border rounded-xl overflow-hidden bg-card', className)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left label panel */}
      <div className="shrink-0 border-r" style={{ width: LABEL_WIDTH }}>
        {/* Header */}
        <div
          className="flex items-end border-b bg-muted/50 px-3 pb-2 sticky top-0 z-10"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task</span>
        </div>
        {/* Task rows */}
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-2 px-3 border-b text-sm cursor-pointer hover:bg-muted/40 transition-colors',
              i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
            )}
            style={{ height: TASK_ROW_HEIGHT }}
            onClick={() => onTaskClick?.(task)}
          >
            {/* Status dot */}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLOR[task.status] ?? '#94a3b8' }}
            />
            <span className="truncate text-sm leading-none">{task.title}</span>
            {task.isMilestone && (
              <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded px-1 shrink-0">
                ◆
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Right scrollable timeline */}
      <div className="flex-1 overflow-x-auto" ref={scrollRef}>
        <svg
          width={totalWidth}
          height={totalHeight}
          className="select-none"
          style={{ display: 'block' }}
        >
          {/* Weekend shading */}
          {columns.map((col, i) =>
            col.isWeekend ? (
              <rect
                key={`weekend-${i}`}
                x={i * dayWidth}
                y={0}
                width={dayWidth}
                height={totalHeight}
                className="fill-muted/40"
              />
            ) : null
          )}

          {/* Today vertical line */}
          {todayX >= 0 && todayX <= totalWidth && (
            <line
              x1={todayX}
              y1={0}
              x2={todayX}
              y2={totalHeight}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.7}
            />
          )}

          {/* Header: top row (month/year groups) */}
          <rect x={0} y={0} width={totalWidth} height={28} className="fill-muted/50" />
          {groupedHeaders.map((g, i) => (
            <g key={`gh-${i}`}>
              <line x1={g.x} y1={0} x2={g.x} y2={28} stroke="hsl(var(--border))" strokeWidth={1} />
              <text
                x={g.x + 6}
                y={18}
                fontSize={11}
                fontWeight="600"
                className="fill-foreground/70"
              >
                {g.label}
              </text>
            </g>
          ))}

          {/* Header: bottom row (day/week labels) */}
          <rect x={0} y={28} width={totalWidth} height={HEADER_HEIGHT - 28} className="fill-muted/30" />
          {columns.map((col, i) => (
            <g key={`col-${i}`}>
              <line
                x1={i * dayWidth}
                y1={28}
                x2={i * dayWidth}
                y2={HEADER_HEIGHT}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                opacity={0.5}
              />
              {dayWidth >= 14 && (
                <text
                  x={i * dayWidth + dayWidth / 2}
                  y={HEADER_HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={10}
                  className={cn(
                    col.isToday ? 'fill-red-500 font-bold' : col.isWeekend ? 'fill-muted-foreground/50' : 'fill-muted-foreground'
                  )}
                >
                  {col.label}
                </text>
              )}
              {col.isToday && (
                <circle cx={i * dayWidth + dayWidth / 2} cy={HEADER_HEIGHT - 4} r={2.5} fill="#ef4444" />
              )}
            </g>
          ))}

          {/* Horizontal row lines */}
          {tasks.map((_, i) => (
            <line
              key={`hline-${i}`}
              x1={0}
              y1={HEADER_HEIGHT + i * TASK_ROW_HEIGHT}
              x2={totalWidth}
              y2={HEADER_HEIGHT + i * TASK_ROW_HEIGHT}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              opacity={0.4}
            />
          ))}

          {/* Task bars */}
          {tasks.map((task, i) => {
            const y = HEADER_HEIGHT + i * TASK_ROW_HEIGHT;
            const cy = y + TASK_ROW_HEIGHT / 2;

            if (!task.startDate || !task.endDate) return null;

            const isDragging = dragging?.taskId === task.id;
            const dOffsetDays = isDragging ? Math.round(dragOffset / dayWidth) : 0;
            const displayStart = isDragging ? addDays(task.startDate, dOffsetDays) : task.startDate;
            const displayEnd = isDragging ? addDays(task.endDate, dOffsetDays) : task.endDate;

            const x = dateToX(displayStart, viewStart, zoom);
            const w = durationToWidth(displayStart, displayEnd, zoom);
            const barH = task.isMilestone ? 0 : 18;
            const barY = cy - barH / 2;
            const barColor = task.color ?? STATUS_COLOR[task.status] ?? '#3b82f6';

            if (task.isMilestone) {
              // Diamond shape
              const mx = dateToX(displayStart, viewStart, zoom);
              return (
                <g key={task.id} style={{ cursor: 'pointer' }} onClick={() => onTaskClick?.(task)}>
                  <polygon
                    points={`${mx},${cy - MILESTONE_SIZE / 2} ${mx + MILESTONE_SIZE / 2},${cy} ${mx},${cy + MILESTONE_SIZE / 2} ${mx - MILESTONE_SIZE / 2},${cy}`}
                    fill="#f59e0b"
                    stroke="#d97706"
                    strokeWidth={1}
                  />
                </g>
              );
            }

            return (
              <g
                key={task.id}
                style={{ cursor: onTaskReschedule ? 'grab' : 'pointer' }}
                onMouseDown={(e) => handleMouseDown(e, { ...task, startDate: task.startDate!, endDate: task.endDate! })}
                onClick={() => !isDragging && onTaskClick?.(task)}
              >
                {/* Bar shadow */}
                <rect x={x + 1} y={barY + 1} width={w} height={barH} rx={3} fill="rgba(0,0,0,0.15)" />
                {/* Bar background */}
                <rect x={x} y={barY} width={w} height={barH} rx={3} fill={barColor} opacity={0.85} />
                {/* Progress fill */}
                {task.progress > 0 && (
                  <rect
                    x={x}
                    y={barY + barH - 3}
                    width={(w * task.progress) / 100}
                    height={3}
                    rx={1.5}
                    fill="rgba(255,255,255,0.7)"
                  />
                )}
                {/* Label inside bar */}
                {w > 50 && (
                  <text
                    x={x + 6}
                    y={cy + 1}
                    fontSize={10}
                    fill="white"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {task.progress > 0 ? `${task.progress}%` : ''}
                  </text>
                )}
                {/* Drag indicator */}
                {isDragging && (
                  <rect x={x - 1} y={barY - 1} width={w + 2} height={barH + 2} rx={4} fill="none" stroke="white" strokeWidth={1.5} />
                )}
              </g>
            );
          })}

          {/* Dependency arrows */}
          {tasks.map((task) => {
            if (!task.dependencies?.length || !task.startDate) return null;
            return task.dependencies.map((depId) => {
              const depTask = tasks.find((t) => t.id === depId);
              if (!depTask?.endDate) return null;
              const depIdx = tasks.indexOf(depTask);
              const taskIdx = tasks.indexOf(task);
              const fromX = dateToX(depTask.endDate, viewStart, zoom) + durationToWidth(depTask.startDate!, depTask.endDate, zoom);
              const fromY = HEADER_HEIGHT + depIdx * TASK_ROW_HEIGHT + TASK_ROW_HEIGHT / 2;
              const toX = dateToX(task.startDate, viewStart, zoom);
              const toY = HEADER_HEIGHT + taskIdx * TASK_ROW_HEIGHT + TASK_ROW_HEIGHT / 2;
              const midX = fromX + 10;
              return (
                <g key={`dep-${depId}-${task.id}`}>
                  <path
                    d={`M${fromX},${fromY} L${midX},${fromY} L${midX},${toY} L${toX},${toY}`}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    markerEnd="url(#arrow)"
                    opacity={0.6}
                  />
                </g>
              );
            });
          })}

          {/* Arrow marker def */}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" opacity={0.6} />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}
