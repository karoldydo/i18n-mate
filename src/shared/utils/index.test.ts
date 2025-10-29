import { describe, expect, it } from 'vitest';

import { cn, parseErrorDetail } from './index';

describe('cn', () => {
  it('merges multiple class names into a single string', () => {
    const result = cn('text-red-500', 'bg-blue-500', 'p-4');

    expect(result).toBe('text-red-500 bg-blue-500 p-4');
  });

  it('handles conditional classes using objects', () => {
    const result = cn('base-class', {
      'active-class': true,
      'inactive-class': false,
    });

    expect(result).toBe('base-class active-class');
  });

  it('handles conditional classes using arrays', () => {
    const result = cn(['class-1', 'class-2'], 'class-3');

    expect(result).toBe('class-1 class-2 class-3');
  });

  it('handles conditional classes with mixed conditions', () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn('button', isActive && 'active', isDisabled && 'disabled');

    expect(result).toBe('button active');
  });

  it('resolves Tailwind CSS class conflicts by keeping the last one', () => {
    const result = cn('p-4', 'p-8');

    expect(result).toBe('p-8');
  });

  it('resolves conflicting Tailwind CSS classes in complex scenarios', () => {
    const result = cn('px-2 py-1 bg-red-500', 'p-4 bg-blue-500');

    expect(result).toBe('p-4 bg-blue-500');
  });

  it('handles undefined values gracefully', () => {
    const result = cn('class-1', undefined, 'class-2');

    expect(result).toBe('class-1 class-2');
  });

  it('handles null values gracefully', () => {
    const result = cn('class-1', null, 'class-2');

    expect(result).toBe('class-1 class-2');
  });

  it('handles empty strings gracefully', () => {
    const result = cn('class-1', '', 'class-2');

    expect(result).toBe('class-1 class-2');
  });

  it('returns empty string when no arguments provided', () => {
    const result = cn();

    expect(result).toBe('');
  });

  it('returns empty string when all arguments are falsy', () => {
    const result = cn(undefined, null, false, '', 0);

    expect(result).toBe('');
  });

  it('preserves duplicate non-Tailwind class names', () => {
    const result = cn('class-1', 'class-2', 'class-1');

    expect(result).toBe('class-1 class-2 class-1');
  });

  it('handles complex real-world scenario with conditional Tailwind classes', () => {
    const isLarge = true;
    const isDisabled = false;
    const isPrimary = true;

    const result = cn(
      'rounded-md font-medium transition-colors',
      isLarge ? 'px-8 py-3 text-lg' : 'px-4 py-2 text-sm',
      {
        'bg-blue-500 text-white hover:bg-blue-600': isPrimary,
        'bg-gray-500 text-white hover:bg-gray-600': !isPrimary,
      },
      isDisabled && 'opacity-50 cursor-not-allowed'
    );

    expect(result).toBe(
      'rounded-md font-medium transition-colors px-8 py-3 text-lg bg-blue-500 text-white hover:bg-blue-600'
    );
  });

  it('preserves non-Tailwind custom classes', () => {
    const result = cn('custom-class', 'another-custom', 'p-4');

    expect(result).toBe('custom-class another-custom p-4');
  });

  it('handles whitespace in class names', () => {
    const result = cn('  class-1  ', 'class-2');

    expect(result).toBe('class-1 class-2');
  });
});

describe('parseErrorDetail', () => {
  it('should parse structured error details correctly', () => {
    const detail = 'error_code:DUPLICATE_LOCALE,field:locale,value:en-US';
    const result = parseErrorDetail(detail);

    expect(result).toEqual({
      error_code: 'DUPLICATE_LOCALE',
      field: 'locale',
      value: 'en-US',
    });
  });

  it('should handle details with colons in values', () => {
    const detail = 'error_code:UNEXPECTED_ERROR,original_error:Some error: with colon';
    const result = parseErrorDetail(detail);

    expect(result).toEqual({
      error_code: 'UNEXPECTED_ERROR',
      original_error: 'Some error: with colon',
    });
  });

  it('should handle empty detail string', () => {
    const result = parseErrorDetail('');

    expect(result).toEqual({});
  });

  it('should handle undefined detail', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = parseErrorDetail(undefined as any);

    expect(result).toEqual({});
  });

  it('should handle single key-value pair', () => {
    const detail = 'error_code:SIMPLE_ERROR';
    const result = parseErrorDetail(detail);

    expect(result).toEqual({
      error_code: 'SIMPLE_ERROR',
    });
  });
});
