import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    // Restore original environment
    Object.assign(import.meta.env, originalEnv);
  });

  it('should create Supabase client when both environment variables are set', async () => {
    // Arrange
    const mockUrl = 'https://test.supabase.co';
    const mockKey = 'test-anon-key';

    import.meta.env.VITE_SUPABASE_URL = mockUrl;
    import.meta.env.VITE_SUPABASE_ANON_KEY = mockKey;

    const { createClient } = await import('@supabase/supabase-js');

    // Act
    const { supabaseClient } = await import('./supabase.client');

    // Assert
    expect(supabaseClient).toBeDefined();
    expect(createClient).toHaveBeenCalledWith(mockUrl, mockKey);
  });

  it('should throw error when VITE_SUPABASE_URL is not set', async () => {
    // Arrange
    import.meta.env.VITE_SUPABASE_URL = '';
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    // Act & Assert
    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_URL is not set');
  });

  it('should throw error when VITE_SUPABASE_URL is undefined', async () => {
    // Arrange
    delete import.meta.env.VITE_SUPABASE_URL;
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    // Act & Assert
    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_URL is not set');
  });

  it('should throw error when VITE_SUPABASE_ANON_KEY is not set', async () => {
    // Arrange
    import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    import.meta.env.VITE_SUPABASE_ANON_KEY = '';

    // Act & Assert
    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_ANON_KEY is not set');
  });

  it('should throw error when VITE_SUPABASE_ANON_KEY is undefined', async () => {
    // Arrange
    import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    delete import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Act & Assert
    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_ANON_KEY is not set');
  });

  it('should throw error when both environment variables are missing', async () => {
    // Arrange
    delete import.meta.env.VITE_SUPABASE_URL;
    delete import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Act & Assert
    await expect(() => import('./supabase.client')).rejects.toThrow('VITE_SUPABASE_URL is not set');
  });

  it('should export SupabaseClient type', async () => {
    // Arrange
    import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    // Act
    const module = await import('./supabase.client');

    // Assert
    expect(module).toHaveProperty('supabaseClient');
    expect(typeof module.supabaseClient).toBe('object');
  });

  it('should call createClient with correct parameters for valid configuration', async () => {
    // Arrange
    const mockUrl = 'https://example.supabase.co';
    const mockKey = 'example-anon-key-123';

    import.meta.env.VITE_SUPABASE_URL = mockUrl;
    import.meta.env.VITE_SUPABASE_ANON_KEY = mockKey;

    const { createClient } = await import('@supabase/supabase-js');
    vi.clearAllMocks();

    // Act
    await import('./supabase.client');

    // Assert
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(mockUrl, mockKey);
  });
});
