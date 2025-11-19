import { render, screen } from '@testing-library/react';
import { Search } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/shared/ui/button';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('rendering', () => {
    it('should render header and description', () => {
      render(<EmptyState description="Try adjusting your filters" header="No items found" />);

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });

    it('should render default inbox icon when no icon prop is provided', () => {
      render(<EmptyState description="No items" header="Empty" />);

      // check that the default inbox icon svg is present by class name
      // eslint-disable-next-line testing-library/no-node-access
      const svgIcon = document.querySelector('svg.lucide-inbox');
      expect(svgIcon).toBeInTheDocument();
    });

    it('should render custom icon when icon prop is provided', () => {
      render(<EmptyState description="No items" header="Empty" icon={<Search data-testid="custom-icon" />} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render actions when actions prop is provided', () => {
      render(
        <EmptyState
          actions={
            <Button data-testid="action-button" onClick={() => undefined}>
              Create Item
            </Button>
          }
          description="Get started"
          header="No items"
        />
      );

      expect(screen.getByTestId('action-button')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create item/i })).toBeInTheDocument();
    });

    it('should not render actions when actions prop is not provided', () => {
      render(<EmptyState description="No items" header="Empty" />);

      // verify no buttons are present when actions are not provided
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should render header as accessible text', () => {
      render(<EmptyState description="No items" header="Empty state" />);

      // verify header text is accessible
      expect(screen.getByText('Empty state')).toBeInTheDocument();
    });

    it('should render description as accessible text', () => {
      render(<EmptyState description="No items available" header="Empty" />);

      // verify description text is accessible
      expect(screen.getByText('No items available')).toBeInTheDocument();
    });
  });

  describe('content display', () => {
    it('should display multiple action buttons', () => {
      render(
        <EmptyState
          actions={
            <>
              <Button data-testid="action-1">Action 1</Button>
              <Button data-testid="action-2">Action 2</Button>
            </>
          }
          description="Get started"
          header="No items"
        />
      );

      expect(screen.getByTestId('action-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-2')).toBeInTheDocument();
    });

    it('should handle long header and description text', () => {
      const longHeader = 'This is a very long header text that should still be displayed correctly';
      const longDescription = 'This is a very long description text that should wrap properly and remain readable';

      render(<EmptyState description={longDescription} header={longHeader} />);

      expect(screen.getByText(longHeader)).toBeInTheDocument();
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });
});
