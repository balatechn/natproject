'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications({ limit: 50 });
  const { data: unreadData } = useNotifications({ isRead: false, limit: 50 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications: any[] = data?.data ?? [];
  const unreadNotifications: any[] = unreadData?.data ?? [];

  const NotificationItem = ({ notif }: { notif: any }) => (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
        !notif.isRead ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-muted/50'
      )}
    >
      <div className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0', !notif.isRead ? 'bg-primary' : 'bg-transparent')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notif.isRead && 'font-medium')}>{notif.title}</p>
        {notif.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notif.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs shrink-0 h-7"
          onClick={() => markRead.mutate(notif.id)}
        >Mark read</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadNotifications.length > 0 && (
            <p className="text-sm text-muted-foreground">{unreadNotifications.length} unread</p>
          )}
        </div>
        {unreadNotifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] py-0 h-4">{unreadNotifications.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
              <Bell className="h-12 w-12 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : notifications.map((n) => <NotificationItem key={n.id} notif={n} />)}
        </TabsContent>

        <TabsContent value="unread" className="mt-4 space-y-2">
          {unreadNotifications.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
              <CheckCheck className="h-12 w-12 opacity-30" />
              <p>You're all caught up!</p>
            </div>
          ) : unreadNotifications.map((n) => <NotificationItem key={n.id} notif={n} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
