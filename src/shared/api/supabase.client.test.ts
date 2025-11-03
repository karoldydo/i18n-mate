import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_SUPABASE_ANON_KEY, TEST_SUPABASE_URL } from '@/test/utils/test-data';

// Mock @supabase/supabase-js module
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {},
    from: vi.fn(),
  })),
}));

describe('supabase.client', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // restore original environment
    Object.assign(import.meta.env, originalEnv);
  });

  it('should create Supabase client when both environment variables are set', async () => {
    import.meta.env.VITE_SUPABASE_URL = TEST_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = TEST_SUPABASE_ANON_KEY;

    const { createClient } = await import('@supabase/supabase-js');

    const { supabaseClient } = await import('./supabase.client');

    expect(supabaseClient).toBeDefined();
    expect(createClient).toHaveBeenCalledWith(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_ANON_KEY,
      expect.objectContaining({
        auth: expect.any(Object),
      })
    );
  });

  it('should throw error when VITE_SUPABASE_URL is not set', async () => {
    import.meta.env.VITE_SUPABASE_URL = '';
    import.meta.env.VITE_SUPABASE_ANON_KEY = TEST_SUPABASE_ANON_KEY;

    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_URL is not set');
  });

  it('should throw error when VITE_SUPABASE_URL is undefined', async () => {
    delete import.meta.env.VITE_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = TEST_SUPABASE_ANON_KEY;

    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_URL is not set');
  });

  it('should throw error when VITE_SUPABASE_ANON_KEY is not set', async () => {
    import.meta.env.VITE_SUPABASE_URL = TEST_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = '';

    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_ANON_KEY is not set');
  });

  it('should throw error when VITE_SUPABASE_ANON_KEY is undefined', async () => {
    import.meta.env.VITE_SUPABASE_URL = TEST_SUPABASE_URL;
    delete import.meta.env.VITE_SUPABASE_ANON_KEY;

    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_ANON_KEY is not set');
  });

  it('should throw error when both environment variables are missing', async () => {
    delete import.meta.env.VITE_SUPABASE_URL;
    delete import.meta.env.VITE_SUPABASE_ANON_KEY;

    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_URL is not set');
  });

  it('should export SupabaseClient type', async () => {
    import.meta.env.VITE_SUPABASE_URL = TEST_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = TEST_SUPABASE_ANON_KEY;

    const module = await import('./supabase.client');

    expect(module).toHaveProperty('supabaseClient');
    expect(typeof module.supabaseClient).toBe('object');
  });

  it('should call createClient with correct parameters for valid configuration', async () => {
    import.meta.env.VITE_SUPABASE_URL = TEST_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = TEST_SUPABASE_ANON_KEY;

    const { createClient } = await import('@supabase/supabase-js');
    vi.clearAllMocks();

    await import('./supabase.client');

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_ANON_KEY,
      expect.objectContaining({
        auth: expect.any(Object),
      })
    );
  });

  it('should configure auth with correct options', async () => {
    import.meta.env.VITE_SUPABASE_URL = TEST_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = TEST_SUPABASE_ANON_KEY;

    const { createClient } = await import('@supabase/supabase-js');
    vi.clearAllMocks();

    await import('./supabase.client');

    expect(createClient).toHaveBeenCalledWith(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_ANON_KEY,
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        }),
      })
    );
  });
});
