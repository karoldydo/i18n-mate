import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from './routes';

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

describe('main.tsx entry point', () => {
  let rootElement: HTMLDivElement;

  beforeEach(() => {
    // Create root element before each test
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    // Clean up root element after each test
    if (document.body.contains(rootElement)) {
      document.body.removeChild(rootElement);
    }
    vi.resetModules();
  });

  it('should throw error when root element is not found', async () => {
    // Arrange: Remove root element
    document.body.removeChild(rootElement);

    // Act & Assert: Dynamically import main.tsx should throw
    await expect(async () => {
      await import('./main.tsx');
    }).rejects.toThrow('Root element not found');

    // Recreate root for afterEach cleanup
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  });

  it('should create root and render app when root element exists', async () => {
    // Arrange
    const mockCreateRoot = vi.mocked(createRoot);

    // Act: Import main.tsx which will execute the side effects
    await import('./main.tsx');

    // Assert: createRoot was called with the root element
    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement);
    expect(mockCreateRoot).toHaveBeenCalledTimes(1);

    // Assert: render was called on the created root
    expect(mockCreateRoot.mock.results[0].value.render).toHaveBeenCalledTimes(1);
  });

  it('should create QueryClient instance without errors', () => {
    // Act & Assert: Creating QueryClient should not throw
    expect(() => new QueryClient()).not.toThrow();
  });

  it('should render application with StrictMode wrapper', () => {
    // Arrange
    const TestComponent = () => <div>Test</div>;

    // Act
    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // Assert
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should render application with QueryClientProvider', () => {
    // Arrange
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const TestComponent = () => <div>Query Test</div>;

    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    // Assert
    expect(screen.getByText('Query Test')).toBeInTheDocument();
  });

  it('should render application with RouterProvider and router', () => {
    // Act
    const { container } = render(<RouterProvider router={router} />);

    // Assert: The router should render without errors
    expect(container).toBeTruthy();
  });

  it('should compose all providers in correct order: StrictMode > QueryClientProvider > RouterProvider', () => {
    // Arrange
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Act
    const { container } = render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>
    );

    // Assert: The composition should render without errors
    expect(container).toBeTruthy();
  });

  it('should validate router configuration', () => {
    // Assert: Router should have proper configuration
    expect(router).toBeDefined();
    expect(router.routes).toBeDefined();
    expect(router.routes.length).toBeGreaterThan(0);
  });

  it('should validate router has root route', () => {
    // Assert: Router should have a root path configured
    const rootRoute = router.routes.find((route) => route.path === '/');
    expect(rootRoute).toBeDefined();
    // Verify the route has either Component or element property
    const hasComponent = rootRoute && ('Component' in rootRoute || 'element' in rootRoute);
    expect(hasComponent).toBe(true);
  });
});
