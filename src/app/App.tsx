import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { AppSidebar, BreadcrumbNavigation, ErrorBoundary, InlineLoading } from '@/shared/components';

import './App.css';
import { Separator } from '@/shared/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/ui/sidebar';

function App() {
  return (
    <ErrorBoundary>
      <SidebarProvider
        style={
          {
            '--header-height': 'calc(var(--spacing) * 12)',
            '--sidebar-width': 'calc(var(--spacing) * 72)',
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <header
            className="bg-background flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
            data-testid="app-header"
          >
            <SidebarTrigger className="-ml-1" />
            <Separator className="mr-2 !h-4" orientation="vertical" />
            <BreadcrumbNavigation />
          </header>
          <div className="flex flex-1 flex-col p-6">
            <Suspense fallback={<InlineLoading />}>
              <Outlet />
            </Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ErrorBoundary>
  );
}

export default App;
