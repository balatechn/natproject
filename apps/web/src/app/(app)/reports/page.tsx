import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Recharts is large — lazy-load the entire reports client so it doesn't inflate
// the shared JS chunk loaded on every page navigation.
const ReportsClient = dynamic(() => import('./_reports-client'), {
  loading: () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  ),
  ssr: false,
});

export const metadata: Metadata = { title: 'Reports & Analytics' };

export default function Page() {
  return <ReportsClient />;
}
