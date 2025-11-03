import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';

import '@/shared/styles/index.css';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';

import { queryClient } from './config/queryClient';
import { AuthProvider } from './providers/AuthProvider';
import { ConfigProvider } from './providers/ConfigProvider';
import { SupabaseProvider } from './providers/SupabaseProvider';
import router from './routes.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <SupabaseProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </SupabaseProvider>
  </StrictMode>
);
