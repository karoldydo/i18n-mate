import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Loading } from './Loading';

describe('Loading', () => {
  describe('rendering', () => {
    it('should render without errors', () => {
      const { container } = render(<Loading />);

      // verify component renders without throwing
      // eslint-disable-next-line testing-library/no-node-access
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render loading spinner', () => {
      const { container } = render(<Loading />);

      // verify the loading spinner svg is present
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('should render container with correct structure', () => {
      const { container } = render(<Loading />);

      // verify container div exists with expected classes
      // eslint-disable-next-line testing-library/no-node-access
      const containerDiv = container.firstChild;
      expect(containerDiv).toBeInTheDocument();
      expect(containerDiv).toHaveClass(
        'animate-in',
        'fade-in',
        'bg-background/80',
        'fixed',
        'inset-0',
        'z-50',
        'flex',
        'items-center',
        'justify-center',
        'backdrop-blur-sm',
        'duration-300'
      );
    });
  });

  describe('accessibility', () => {
    it('should render loading indicator that is visible', () => {
      const { container } = render(<Loading />);

      // verify the spinner svg is rendered and visible
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toBeVisible();
    });
  });

  describe('visual presentation', () => {
    it('should center the loading spinner', () => {
      const { container } = render(<Loading />);

      // verify container has centering classes
      // eslint-disable-next-line testing-library/no-node-access
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should apply fixed positioning with full screen coverage', () => {
      const { container } = render(<Loading />);

      // verify container has fixed positioning and full screen coverage
      // eslint-disable-next-line testing-library/no-node-access
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('should apply backdrop blur and background overlay', () => {
      const { container } = render(<Loading />);

      // verify backdrop blur and background overlay classes are applied
      // eslint-disable-next-line testing-library/no-node-access
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('backdrop-blur-sm', 'bg-background/80');
    });

    it('should apply animation classes to spinner', () => {
      const { container } = render(<Loading />);

      // verify spinner has animation classes
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toHaveClass('animate-spin');
    });

    it('should apply fade-in animation to container', () => {
      const { container } = render(<Loading />);

      // verify container has fade-in animation classes
      // eslint-disable-next-line testing-library/no-node-access
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('animate-in', 'fade-in', 'duration-300');
    });
  });
});
