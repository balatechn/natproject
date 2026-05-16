import type { Metadata } from 'next';
import AdminClient from './_admin-client';

export const metadata: Metadata = { title: 'Administration' };

export default function Page() {
  return <AdminClient />;
}