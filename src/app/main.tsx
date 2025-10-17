import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';

import '@/shared/styles/index.css';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { queryClient } from './config/queryClient';
import { SupabaseProvider } from './providers/SupabaseProvider';
import router from './routes.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <SupabaseProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </SupabaseProvider>
  </StrictMode>
);
