import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ValidationError } from './ValidationError';

describe('ValidationError', () => {
  const defaultProps = {
    buttonLabel: 'Go back',
    dataTestId: 'validation-error',
    to: '/projects',
  };

  const renderWithRouter = (props = defaultProps) => {
    return render(
      <MemoryRouter>
        <ValidationError {...props} />
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render without errors', () => {
      renderWithRouter();

      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    });

    it('should render error heading', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { level: 2, name: 'Invalid parameter' })).toBeInTheDocument();
    });

    it('should render error description text', () => {
      renderWithRouter();

      expect(
        screen.getByText('The parameter in the URL is not valid, please go back to the previous page and try again.')
      ).toBeInTheDocument();
    });

    it('should render link with button label', () => {
      renderWithRouter();

      expect(screen.getByRole('link', { name: 'Go back' })).toBeInTheDocument();
    });

    it('should render arrow icon', () => {
      const { container } = renderWithRouter();

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should use custom buttonLabel prop', () => {
      renderWithRouter({
        ...defaultProps,
        buttonLabel: 'Return to dashboard',
      });

      expect(screen.getByRole('link', { name: 'Return to dashboard' })).toBeInTheDocument();
    });

    it('should use custom dataTestId prop', () => {
      renderWithRouter({
        ...defaultProps,
        dataTestId: 'custom-test-id',
      });

      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
      expect(screen.getByTestId('custom-test-id-button')).toBeInTheDocument();
    });

    it('should set correct href on link', () => {
      renderWithRouter({
        ...defaultProps,
        to: '/dashboard',
      });

      const link = screen.getByRole('link', { name: 'Go back' });
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('accessibility', () => {
    it('should render heading as h2 element', () => {
      renderWithRouter();

      const heading = screen.getByRole('heading', { level: 2, name: 'Invalid parameter' });
      expect(heading.tagName).toBe('H2');
    });

    it('should have aria-label on link', () => {
      renderWithRouter();

      const link = screen.getByRole('link', { name: 'Go back' });
      expect(link).toHaveAttribute('aria-label', 'Go back');
    });

    it('should have aria-hidden on icon', () => {
      const { container } = renderWithRouter();

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should have data-testid on root container', () => {
      renderWithRouter();

      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    });

    it('should have data-testid on link button', () => {
      renderWithRouter();

      expect(screen.getByTestId('validation-error-button')).toBeInTheDocument();
    });

    it('should make error message accessible to screen readers', () => {
      renderWithRouter();

      expect(screen.getByText('Invalid parameter')).toBeInTheDocument();
      expect(
        screen.getByText('The parameter in the URL is not valid, please go back to the previous page and try again.')
      ).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to correct route when link is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter({
        ...defaultProps,
        to: '/projects',
      });

      const link = screen.getByRole('link', { name: 'Go back' });
      await user.click(link);

      expect(link).toHaveAttribute('href', '/projects');
    });

    it('should handle relative paths', () => {
      renderWithRouter({
        ...defaultProps,
        to: '../dashboard',
      });

      const link = screen.getByRole('link', { name: 'Go back' });
      // react router normalizes relative paths to absolute paths
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('should handle absolute paths', () => {
      renderWithRouter({
        ...defaultProps,
        to: '/absolute/path',
      });

      const link = screen.getByRole('link', { name: 'Go back' });
      expect(link).toHaveAttribute('href', '/absolute/path');
    });
  });

  describe('content display', () => {
    it('should handle long button labels', () => {
      const longLabel = 'This is a very long button label that should still be displayed correctly';

      renderWithRouter({
        ...defaultProps,
        buttonLabel: longLabel,
      });

      expect(screen.getByRole('link', { name: longLabel })).toBeInTheDocument();
    });

    it('should handle empty string button label', () => {
      renderWithRouter({
        ...defaultProps,
        buttonLabel: '',
      });

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should handle special characters in button label', () => {
      renderWithRouter({
        ...defaultProps,
        buttonLabel: 'Go back & try again!',
      });

      expect(screen.getByRole('link', { name: 'Go back & try again!' })).toBeInTheDocument();
    });
  });

  describe('visual presentation', () => {
    it('should render container with correct structure', () => {
      const { container } = renderWithRouter();

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const rootContainer = container.querySelector('[data-testid="validation-error"]');
      expect(rootContainer).toBeInTheDocument();
      expect(rootContainer).toHaveClass('container');
    });

    it('should render error box with destructive styling', () => {
      const { container } = renderWithRouter();

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const errorBox = container.querySelector('.border-destructive');
      expect(errorBox).toBeInTheDocument();
      expect(errorBox).toHaveClass('bg-destructive/10', 'rounded-lg', 'border', 'p-4');
    });

    it('should render heading with destructive text color', () => {
      renderWithRouter();

      const heading = screen.getByRole('heading', { level: 2, name: 'Invalid parameter' });
      expect(heading).toHaveClass('text-destructive', 'mb-1', 'text-lg', 'font-semibold');
    });

    it('should render description with muted foreground color', () => {
      renderWithRouter();

      const description = screen.getByText(
        'The parameter in the URL is not valid, please go back to the previous page and try again.'
      );
      expect(description).toHaveClass('text-muted-foreground', 'mb-5', 'text-sm');
    });

    it('should render link with destructive button styling', () => {
      renderWithRouter();

      const link = screen.getByRole('link', { name: 'Go back' });
      expect(link).toHaveClass(
        'bg-destructive',
        'text-destructive-foreground',
        'hover:bg-destructive/90',
        'inline-flex',
        'h-10',
        'items-center',
        'justify-center',
        'rounded-md',
        'px-4',
        'py-2',
        'text-sm',
        'font-medium',
        'transition-colors'
      );
    });
  });
});
