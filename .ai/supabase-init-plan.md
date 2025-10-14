# Supabase Initialization

This document provides a reproducible guide to create the necessary file structure for integrating Supabase into your React + Vite project.

## Prerequisites

- Your project should use React 19, TypeScript 5, and Tailwind 4 (built with Vite).
- Install the `@supabase/supabase-js` package.
- Ensure that `/supabase/config.toml` exists.
- Ensure that a file `/src/shared/types/database.types.ts` exists and contains the correct type definitions for your database.

IMPORTANT: Check prerequisites before performing actions below. If they're not met, stop and ask a user for the fix.

## File Structure and Setup

### 1. Supabase Client Initialization

Create the file `/src/shared/api/supabase.client.ts` with the following content:

```ts
import { createClient, type SupabaseClient as RawSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not set');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set');
}

export type SupabaseClient = RawSupabaseClient<Database>;

export const supabaseClient: SupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

This file initializes the Supabase client using the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Export the `SupabaseClient` type from this file and use it across the app.

### 2. React Context Setup

Create the file `/src/app/providers/SupabaseProvider.tsx` with the following content:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { supabaseClient, type SupabaseClient } from '../../shared/api/supabase.client';

type SupabaseContextValue = SupabaseClient;

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

interface SupabaseProviderProps {
  children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const value = useMemo(() => supabaseClient, []);
  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return ctx;
}
```

Wrap your application with the provider (e.g., in `/src/app/main.tsx`):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SupabaseProvider } from './providers/SupabaseProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseProvider>
      <App />
    </SupabaseProvider>
  </StrictMode>
);
```

### 3. TypeScript Environment Definitions

Create the file `src/env.d.ts` with the following content:

```ts
/// <reference types="vite/client" />

import type { SupabaseClient } from './shared/api/supabase.client';
import type { Database } from './shared/types/database.types';

declare global {
  // Add shared global types here if needed
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Re-export the app-wide SupabaseClient type for convenience
export type AppSupabaseClient = SupabaseClient & { _db?: Database };
```

This file defines strongly-typed environment variables for Vite and centralizes the Supabase client type for consistent usage throughout your application.

- Implemented a React + Vite-focused setup: shared client in `src/shared/api`, context provider and `useSupabase` hook in `src/app/providers`, and Vite env typing in `src/env.d.ts`.
