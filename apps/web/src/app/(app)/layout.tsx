import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — implemented in Phase 3 */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shadow">
            <span className="text-sm font-bold text-white">N</span>
          </div>
          <span className="font-semibold text-sidebar-foreground">NAT Project</span>
        </div>
        <nav className="flex-1 p-3">
          <p className="text-xs text-sidebar-foreground/40">Navigation — Phase 3</p>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
          <p className="text-sm text-muted-foreground">Top bar — Phase 3</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
