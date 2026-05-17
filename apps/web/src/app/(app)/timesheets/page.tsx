import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const TimesheetsClient = dynamic(() => import('./_timesheets-client'), {
  loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  ssr: false,
});

export const metadata: Metadata = { title: 'Timesheets' };

export default function Page() {
  return <TimesheetsClient />;
}
