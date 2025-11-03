import type { UseQueryResult } from '@tanstack/react-query';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '@/shared/types';

import { useAppConfig } from '@/shared/api/useAppConfig';
import { createTestWrapper } from '@/test/utils';

import { ConfigProvider, useConfig } from './ConfigProvider';

vi.mock('@/shared/api/useAppConfig');

const mockUseAppConfig = vi.mocked(useAppConfig);

describe('ConfigProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function TestComponent() {
    const { config, error, isLoading } = useConfig();

    if (isLoading) return <div>Loading config...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!config) return <div>No config</div>;

    return (
      <div>
        <div>Registration: {config.registrationEnabled ? 'on' : 'off'}</div>
        <div>Verification: {config.emailVerificationRequired ? 'on' : 'off'}</div>
      </div>
    );
  }

  it('should provide config to children', () => {
    mockUseAppConfig.mockReturnValue({
      data: {
        emailVerificationRequired: false,
        registrationEnabled: true,
      },
      error: null,
      isLoading: false,
    } as UseQueryResult<AppConfig, Error>);

    const TestWrapper = createTestWrapper();

    render(
      <TestWrapper>
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      </TestWrapper>
    );

    expect(screen.getByText('Registration: on')).toBeInTheDocument();
    expect(screen.getByText('Verification: off')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseAppConfig.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as UseQueryResult<AppConfig, Error>);

    const TestWrapper = createTestWrapper();

    render(
      <TestWrapper>
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      </TestWrapper>
    );

    expect(screen.getByText('Loading config...')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    const mockError = new Error('Failed to fetch config');
    mockUseAppConfig.mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
    } as UseQueryResult<AppConfig, Error>);

    const TestWrapper = createTestWrapper();

    render(
      <TestWrapper>
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      </TestWrapper>
    );

    expect(screen.getByText('Error: Failed to fetch config')).toBeInTheDocument();
  });

  it('should handle undefined config (fail-closed)', () => {
    mockUseAppConfig.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    } as UseQueryResult<AppConfig, Error>);

    const TestWrapper = createTestWrapper();

    render(
      <TestWrapper>
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      </TestWrapper>
    );

    expect(screen.getByText('No config')).toBeInTheDocument();
  });

  it('should throw error when useConfig is used outside provider', () => {
    // suppress console.error for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useConfig must be used within ConfigProvider');

    consoleErrorSpy.mockRestore();
  });
});
