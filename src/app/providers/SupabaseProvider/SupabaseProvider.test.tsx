import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SupabaseProvider, useSupabase } from './SupabaseProvider';

function TestComponent() {
  const supabase = useSupabase();
  return <div>Supabase client: {supabase ? 'loaded' : 'not loaded'}</div>;
}

describe('SupabaseProvider', () => {
  it('should provide Supabase client to children', () => {
    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    expect(screen.getByText('Supabase client: loaded')).toBeInTheDocument();
  });

  it('should throw error when useSupabase is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty to suppress error output in tests
    });

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSupabase must be used within SupabaseProvider');

    consoleSpy.mockRestore();
  });
});
