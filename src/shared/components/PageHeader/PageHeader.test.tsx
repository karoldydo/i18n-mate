import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  describe('rendering', () => {
    it('should render header text', () => {
      render(<PageHeader header="Test Page" />);

      expect(screen.getByRole('heading', { level: 1, name: 'Test Page' })).toBeInTheDocument();
    });

    it('should render subHeading when provided', () => {
      render(<PageHeader header="Test Page" subHeading="This is a subheading" />);

      expect(screen.getByText('This is a subheading')).toBeInTheDocument();
    });

    it('should render children when provided', () => {
      render(
        <PageHeader header="Test Page">
          <button>Custom Action</button>
        </PageHeader>
      );

      expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
    });

    it('should render children instead of subHeading when both are provided', () => {
      render(
        <PageHeader header="Test Page" subHeading="This should not appear">
          <button>Custom Action</button>
        </PageHeader>
      );

      expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
      expect(screen.queryByText('This should not appear')).not.toBeInTheDocument();
    });

    it('should not render subHeading section when neither children nor subHeading are provided', () => {
      const { container } = render(<PageHeader header="Test Page" />);

      // verify only the h1 is rendered, no subheading section
      expect(screen.getByRole('heading', { level: 1, name: 'Test Page' })).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const subHeadingSection = container.querySelector('div.flex.flex-col.gap-1');
      expect(subHeadingSection).not.toBeInTheDocument();
    });

    it('should not render subHeading section when subHeading is null', () => {
      const { container } = render(<PageHeader header="Test Page" subHeading={null} />);

      // verify only the h1 is rendered, no subheading section
      expect(screen.getByRole('heading', { level: 1, name: 'Test Page' })).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const subHeadingSection = container.querySelector('div.flex.flex-col.gap-1');
      expect(subHeadingSection).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should render header as h1 element', () => {
      render(<PageHeader header="Accessible Page Title" />);

      const heading = screen.getByRole('heading', { level: 1, name: 'Accessible Page Title' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });

    it('should render subHeading as paragraph element', () => {
      render(<PageHeader header="Test Page" subHeading="Accessible description" />);

      const subHeading = screen.getByText('Accessible description');
      expect(subHeading.tagName).toBe('P');
    });

    it('should make header text accessible to screen readers', () => {
      render(<PageHeader header="Screen Reader Test" />);

      expect(screen.getByText('Screen Reader Test')).toBeInTheDocument();
    });
  });

  describe('content display', () => {
    it('should handle long header text', () => {
      const longHeader = 'This is a very long header text that should still be displayed correctly and remain readable';

      render(<PageHeader header={longHeader} />);

      expect(screen.getByText(longHeader)).toBeInTheDocument();
    });

    it('should handle long subHeading text', () => {
      const longSubHeading = 'This is a very long subheading text that should wrap properly and remain readable';

      render(<PageHeader header="Test Page" subHeading={longSubHeading} />);

      expect(screen.getByText(longSubHeading)).toBeInTheDocument();
    });

    it('should render multiple children elements', () => {
      render(
        <PageHeader header="Test Page">
          <button>Action 1</button>
          <button>Action 2</button>
          <p>Additional content</p>
        </PageHeader>
      );

      expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
      expect(screen.getByText('Additional content')).toBeInTheDocument();
    });

    it('should render complex children structure', () => {
      render(
        <PageHeader header="Test Page">
          <div>
            <span>Nested content</span>
            <button>Nested button</button>
          </div>
        </PageHeader>
      );

      expect(screen.getByText('Nested content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Nested button' })).toBeInTheDocument();
    });
  });
});
