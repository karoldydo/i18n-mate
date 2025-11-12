import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InlineLoading } from './InlineLoading';

describe('InlineLoading', () => {
  describe('rendering', () => {
    it('should render without errors', () => {
      const { container } = render(<InlineLoading />);

      // verify component renders without throwing
      // eslint-disable-next-line testing-library/no-node-access
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render loading spinner', () => {
      const { container } = render(<InlineLoading />);

      // verify the loading spinner svg is present
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('should render container with correct structure', () => {
      const { container } = render(<InlineLoading />);

      // verify container div exists with expected classes
      // eslint-disable-next-line testing-library/no-node-access
      const containerDiv = container.firstChild;
      expect(containerDiv).toBeInTheDocument();
      expect(containerDiv).toHaveClass(
        'animate-in',
        'fade-in',
        'flex',
        'h-full',
        'items-center',
        'justify-center',
        'duration-300'
      );
    });
  });

  describe('accessibility', () => {
    it('should render loading indicator that is visible', () => {
      const { container } = render(<InlineLoading />);

      // verify the spinner svg is rendered and visible
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toBeVisible();
    });
  });

  describe('visual presentation', () => {
    it('should center the loading spinner', () => {
      const { container } = render(<InlineLoading />);

      // verify container has centering classes
      // eslint-disable-next-line testing-library/no-node-access
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should apply animation classes to spinner', () => {
      const { container } = render(<InlineLoading />);

      // verify spinner has animation classes
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toHaveClass('animate-spin');
    });
  });
});
