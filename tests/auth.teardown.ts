import { test as teardown } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import type { Database } from '../src/shared/types/database.types';

/**
 * Authentication Teardown
 *
 * Cleans up all test data created by E2E test user after all tests complete.
 * Deletes all projects owned by the test user, which cascades to:
 * - project_locales
 * - keys
 * - translations
 * - translation_jobs
 * - translation_job_items
 * - telemetry_events
 *
 * Extracts user ID from authenticated session stored in .auth/user.json by auth.setup.ts.
 */

const AUTH_FILE = '.auth/user.json';

teardown('cleanup e2e test user data', async () => {
  // validate required environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[teardown] Missing Supabase credentials. Skipping cleanup. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
    return;
  }

  // extract user ID and auth data from storage state created by auth.setup.ts
  const storageStatePath = join(process.cwd(), AUTH_FILE);
  if (!existsSync(storageStatePath)) {
    console.warn('[teardown] Storage state file not found. Skipping cleanup.');
    return;
  }

  let userId: null | string = null;
  let authData: null | {
    access_token: string;
    refresh_token?: string;
    user?: { id: string };
  } = null;

  try {
    const storageState = JSON.parse(readFileSync(storageStatePath, 'utf-8'));

    // extract auth token from localStorage (Supabase stores it as sb-<project-ref>-auth-token)
    const localStorage = storageState?.origins?.[0]?.localStorage || [];
    const authEntry = localStorage.find((item: { name: string }) => item.name.includes('auth-token'));

    if (!authEntry) {
      console.warn('[teardown] Auth token not found in storage state. Skipping cleanup.');
      return;
    }

    authData = JSON.parse(authEntry.value);
    const accessToken = authData?.access_token;

    if (!accessToken) {
      console.warn('[teardown] Access token not found in auth data. Skipping cleanup.');
      return;
    }

    // extract user ID directly from authData (Supabase stores user object in auth token)
    if (authData?.user?.id) {
      userId = authData.user.id;
      console.log(`[teardown] Extracted user ID from storage state: ${userId}`);
    } else {
      // fallback: try to get user from token if user object is not available
      const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        console.warn('[teardown] Could not get user from token:', userError?.message);
        return;
      }

      userId = user.id;
      console.log(`[teardown] Extracted user ID from token: ${userId}`);
    }
  } catch (error) {
    console.warn('[teardown] Failed to read storage state:', error instanceof Error ? error.message : String(error));
    return;
  }

  if (!userId || !authData) {
    console.warn('[teardown] Could not determine test user ID. Ensure auth.setup.ts runs successfully.');
    return;
  }

  // create supabase client
  // prefer service role key if available for direct access, otherwise use anon key with user context
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // if using anon key, set session from extracted auth data
  if (!serviceRoleKey) {
    try {
      await supabase.auth.setSession({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token || '',
      });
    } catch {
      console.warn('[teardown] Could not set session. Continuing with cleanup...');
    }
  }

  // fetch all projects for the user
  const query = supabase.from('projects').select('id, name');
  const projectsQuery = serviceRoleKey ? query.eq('owner_user_id', userId) : query;

  const { data: projects, error: fetchError } = await projectsQuery;

  if (fetchError) {
    console.error('[teardown] Failed to fetch projects:', fetchError.message);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('[teardown] No projects found for E2E test user');
    return;
  }

  // delete all projects (cascade deletes all related data)
  let deletedCount = 0;
  for (const project of projects) {
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', project.id);

    if (deleteError) {
      console.error(`[teardown] Failed to delete project ${project.name} (${project.id}):`, deleteError.message);
    } else {
      console.log(`[teardown] Deleted project: ${project.name} (${project.id})`);
      deletedCount++;
    }
  }

  console.log(`[teardown] Cleanup complete. Deleted ${deletedCount} of ${projects.length} project(s).`);
});
