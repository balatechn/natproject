'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/index';
import {
  LayoutDashboard, FolderKanban, CheckSquare, GanttChart,
  Users, Calendar, Zap, MessageSquare, BarChart3,
  Bell, Settings, ChevronLeft, ChevronRight, Leaf,
  Building2, Clock,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { label: 'Dashboard',     href: '/dashboard',      icon: LayoutDashboard },
  { label: 'Projects',      href: '/projects',        icon: FolderKanban },
  { label: 'Tasks',         href: '/tasks',           icon: CheckSquare },
  { label: 'Gantt',         href: '/gantt',           icon: GanttChart },
  { label: 'Resources',     href: '/resources',       icon: Users },
  { label: 'Team Planner',  href: '/team-planner',    icon: Calendar },
  { label: 'Workflows',     href: '/workflows',       icon: Zap },
  { label: 'CRM',           href: '/crm',             icon: Building2 },
  { label: 'Timesheets',    href: '/timesheets',      icon: Clock },
  { label: 'Reports',       href: '/reports',         icon: BarChart3 },
  { label: 'Notifications', href: '/notifications',   icon: Bell },
  { label: 'Admin',         href: '/admin',           icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-14 px-3 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sidebar-foreground font-semibold text-sm truncate">NAT Project</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const item = (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                  'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  active && 'bg-sidebar-accent text-sidebar-foreground font-medium',
                  collapsed && 'justify-center px-0',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return item;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => setSidebarCollapsed(!collapsed)}
            className="w-full flex items-center justify-center rounded-md p-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
              <span className="flex items-center gap-2 text-xs">
                <ChevronLeft className="w-4 h-4" /> Collapse
              </span>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
