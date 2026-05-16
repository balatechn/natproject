import type { Metadata } from 'next';
import ReportsClient from './_reports-client';

export const metadata: Metadata = { title: 'Reports & Analytics' };

export default function Page() {
  return <ReportsClient />;
}