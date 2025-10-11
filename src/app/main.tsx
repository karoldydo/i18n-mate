import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';

import '@/shared/styles/index.css';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import router from './routes.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const queryClient = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
