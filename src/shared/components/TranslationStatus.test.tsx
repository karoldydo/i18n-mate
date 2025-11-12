import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TranslationStatus } from './TranslationStatus';

describe('TranslationStatus', () => {
  describe('rendering', () => {
    it('should render without errors when isMachineTranslated is null', () => {
      render(<TranslationStatus isMachineTranslated={null} />);

      expect(screen.getByText('No translation')).toBeInTheDocument();
    });

    it('should render machine translated badge when isMachineTranslated is true', () => {
      render(<TranslationStatus isMachineTranslated={true} />);

      expect(screen.getByText('Machine')).toBeInTheDocument();
      expect(screen.getByLabelText('Machine translated')).toBeInTheDocument();
    });

    it('should render manual translated badge when isMachineTranslated is false', () => {
      render(<TranslationStatus isMachineTranslated={false} />);

      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByLabelText('Manually translated')).toBeInTheDocument();
    });

    it('should render formatted date when updatedAt is provided', () => {
      const updatedAt = '2024-01-15T10:30:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      // date format: "Jan 15, 2024" (en-US locale)
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('should not render date when updatedAt is null', () => {
      render(<TranslationStatus isMachineTranslated={true} updatedAt={null} />);

      expect(screen.getByText('Machine')).toBeInTheDocument();
      expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).not.toBeInTheDocument();
    });

    it('should not render date when updatedAt is undefined', () => {
      render(<TranslationStatus isMachineTranslated={true} />);

      expect(screen.getByText('Machine')).toBeInTheDocument();
      expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).not.toBeInTheDocument();
    });

    it('should render both badge and date when both are provided', () => {
      const updatedAt = '2024-03-20T14:45:00Z';
      render(<TranslationStatus isMachineTranslated={false} updatedAt={updatedAt} />);

      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByText(/Mar 20, 2024/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on machine translated badge', () => {
      render(<TranslationStatus isMachineTranslated={true} />);

      const badge = screen.getByLabelText('Machine translated');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'Machine translated');
    });

    it('should have aria-label on manual translated badge', () => {
      render(<TranslationStatus isMachineTranslated={false} />);

      const badge = screen.getByLabelText('Manually translated');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'Manually translated');
    });

    it('should render "No translation" text when isMachineTranslated is null', () => {
      render(<TranslationStatus isMachineTranslated={null} />);

      const noTranslationText = screen.getByText('No translation');
      expect(noTranslationText).toBeInTheDocument();
      expect(noTranslationText.tagName).toBe('SPAN');
    });
  });

  describe('date formatting', () => {
    it('should format date correctly for January', () => {
      const updatedAt = '2024-01-05T00:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      expect(screen.getByText('Jan 5, 2024')).toBeInTheDocument();
    });

    it('should format date correctly for December', () => {
      const updatedAt = '2024-12-25T00:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      expect(screen.getByText('Dec 25, 2024')).toBeInTheDocument();
    });

    it('should format date correctly for single digit day', () => {
      const updatedAt = '2024-06-03T00:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      expect(screen.getByText('Jun 3, 2024')).toBeInTheDocument();
    });

    it('should format date correctly for double digit day', () => {
      const updatedAt = '2024-06-15T00:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
    });

    it('should handle different years correctly', () => {
      const updatedAt = '2023-07-10T00:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      expect(screen.getByText('Jul 10, 2023')).toBeInTheDocument();
    });
  });

  describe('visual presentation', () => {
    it('should render container with flex layout when badge is shown', () => {
      const { container } = render(<TranslationStatus isMachineTranslated={true} />);

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const containerDiv = container.querySelector('.flex.items-center.gap-4');
      expect(containerDiv).toBeInTheDocument();
    });

    it('should render "No translation" with muted foreground and italic styling', () => {
      render(<TranslationStatus isMachineTranslated={null} />);

      const noTranslationText = screen.getByText('No translation');
      expect(noTranslationText).toHaveClass('text-muted-foreground', 'text-xs', 'italic');
    });

    it('should render date with muted foreground and small text', () => {
      const updatedAt = '2024-01-15T00:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      const dateText = screen.getByText('Jan 15, 2024');
      expect(dateText).toHaveClass('text-muted-foreground', 'text-xs');
    });
  });

  describe('icon rendering', () => {
    it('should render Bot icon for machine translated', () => {
      const { container } = render(<TranslationStatus isMachineTranslated={true} />);

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
      // bot icon should be present (lucide-react icons render as svg)
      expect(screen.getByText('Machine')).toBeInTheDocument();
    });

    it('should render User icon for manual translated', () => {
      const { container } = render(<TranslationStatus isMachineTranslated={false} />);

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
      // user icon should be present (lucide-react icons render as svg)
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('should not render icons when isMachineTranslated is null', () => {
      const { container } = render(<TranslationStatus isMachineTranslated={null} />);

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string updatedAt', () => {
      render(<TranslationStatus isMachineTranslated={true} updatedAt="" />);

      expect(screen.getByText('Machine')).toBeInTheDocument();
      // empty string should result in invalid date, so no date should be shown
      expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).not.toBeInTheDocument();
    });

    it('should handle invalid date string gracefully', () => {
      render(<TranslationStatus isMachineTranslated={true} updatedAt="invalid-date" />);

      expect(screen.getByText('Machine')).toBeInTheDocument();
      // invalid date should not crash, date may not render or render as invalid date
      // component should still render the badge
    });

    it('should handle very old dates', () => {
      const updatedAt = '2000-01-01T00:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      expect(screen.getByText('Jan 1, 2000')).toBeInTheDocument();
    });

    it('should handle future dates', () => {
      // use midday to avoid timezone conversion issues
      const updatedAt = '2030-12-31T12:00:00Z';
      render(<TranslationStatus isMachineTranslated={true} updatedAt={updatedAt} />);

      // date may vary based on timezone, so check that a date with year 2030 or 2031 is rendered
      const dateText = screen.getByText(/\w{3} \d{1,2}, 203[01]/);
      expect(dateText).toBeInTheDocument();
      expect(dateText).toHaveTextContent(/203[01]/);
    });
  });
});
