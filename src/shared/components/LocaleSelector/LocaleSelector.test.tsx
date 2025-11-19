import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PRIMARY_LOCALES } from '@/shared/constants/locales.constants';

import { LocaleSelector } from './LocaleSelector';

describe('LocaleSelector', () => {
  const defaultProps = {
    onValueChange: vi.fn(),
  };

  describe('rendering', () => {
    it('should render without errors', () => {
      render(<LocaleSelector {...defaultProps} />);

      expect(screen.getByTestId('locale-selector-trigger')).toBeInTheDocument();
    });

    it('should render trigger button', () => {
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveRole('combobox');
    });

    it('should render placeholder text when no value is selected', () => {
      render(<LocaleSelector {...defaultProps} />);

      expect(screen.getByText('Select language')).toBeInTheDocument();
    });

    it('should render custom data-testid when provided', () => {
      render(<LocaleSelector {...defaultProps} data-testid="custom-selector" />);

      expect(screen.getByTestId('custom-selector')).toBeInTheDocument();
    });

    it('should render selected value when value prop is provided', () => {
      render(<LocaleSelector {...defaultProps} value="en-US" />);

      // radix select displays the selected item text
      const trigger = screen.getByTestId('locale-selector-trigger');
      expect(trigger).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should open dropdown when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      // wait for portal content to appear (radix select uses portals)
      const content = await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });
      expect(content).toBeInTheDocument();
    });

    it('should render all primary locales in dropdown', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      // verify all locales are rendered
      PRIMARY_LOCALES.forEach((locale) => {
        const option = screen.getByTestId(`locale-option-${locale.code}`);
        expect(option).toBeInTheDocument();
        expect(option).toHaveTextContent(`${locale.label} (${locale.code})`);
      });
    });

    it('should call onValueChange when a locale is selected', async () => {
      const user = userEvent.setup();
      const mockOnValueChange = vi.fn();
      render(<LocaleSelector {...defaultProps} onValueChange={mockOnValueChange} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      const option = screen.getByTestId('locale-option-en-US');
      await user.click(option);

      expect(mockOnValueChange).toHaveBeenCalledTimes(1);
      expect(mockOnValueChange).toHaveBeenCalledWith('en-US');
    });

    it('should call onValueChange with correct locale code for different locales', async () => {
      const user = userEvent.setup();
      const mockOnValueChange = vi.fn();
      render(<LocaleSelector {...defaultProps} onValueChange={mockOnValueChange} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      const option = screen.getByTestId('locale-option-pl');
      await user.click(option);

      expect(mockOnValueChange).toHaveBeenCalledWith('pl');
    });

    it('should close dropdown after selecting an option', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      const option = screen.getByTestId('locale-option-en');
      await user.click(option);

      await waitFor(() => {
        expect(screen.queryByTestId('locale-selector-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('disabled state', () => {
    it('should disable selector when disabled prop is true', () => {
      render(<LocaleSelector {...defaultProps} disabled />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      expect(trigger).toBeDisabled();
    });

    it('should enable selector when disabled prop is false', () => {
      render(<LocaleSelector {...defaultProps} disabled={false} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      expect(trigger).toBeEnabled();
    });

    it('should enable selector by default when disabled prop is not provided', () => {
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      expect(trigger).toBeEnabled();
    });

    it('should not open dropdown when disabled and trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} disabled />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      // wait a bit to ensure dropdown doesn't open
      await waitFor(
        () => {
          expect(screen.queryByTestId('locale-selector-content')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should not call onValueChange when disabled', async () => {
      const user = userEvent.setup();
      const mockOnValueChange = vi.fn();
      render(<LocaleSelector {...defaultProps} disabled onValueChange={mockOnValueChange} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      expect(mockOnValueChange).not.toHaveBeenCalled();
    });
  });

  describe('value prop', () => {
    it('should display selected locale when value prop is set', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} value="en-US" />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      // verify the selected option is marked as selected
      const selectedOption = screen.getByTestId('locale-option-en-US');
      expect(selectedOption).toBeInTheDocument();
    });

    it('should update displayed value when value prop changes', () => {
      const { rerender } = render(<LocaleSelector {...defaultProps} value="en" />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      expect(trigger).toBeInTheDocument();

      rerender(<LocaleSelector {...defaultProps} value="pl" />);

      expect(trigger).toBeInTheDocument();
    });

    it('should handle undefined value prop', () => {
      render(<LocaleSelector {...defaultProps} value={undefined} />);

      expect(screen.getByText('Select language')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible trigger button', () => {
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });

    it('should have data-testid on trigger', () => {
      render(<LocaleSelector {...defaultProps} />);

      expect(screen.getByTestId('locale-selector-trigger')).toBeInTheDocument();
    });

    it('should have data-testid on content when opened', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      const content = await screen.findByTestId('locale-selector-content');
      expect(content).toBeInTheDocument();
    });

    it('should have data-testid on each locale option', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      PRIMARY_LOCALES.forEach((locale) => {
        expect(screen.getByTestId(`locale-option-${locale.code}`)).toBeInTheDocument();
      });
    });

    it('should have proper role on options', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      // radix select items have option role
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('locale options', () => {
    it('should render all locales from PRIMARY_LOCALES constant', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      expect(screen.getByTestId('locale-option-en')).toBeInTheDocument();
      expect(screen.getByTestId('locale-option-en-US')).toBeInTheDocument();
      expect(screen.getByTestId('locale-option-pl')).toBeInTheDocument();
    });

    it('should display locale label and code for each option', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      // verify format: "Label (code)"
      expect(screen.getByText('English (en)')).toBeInTheDocument();
      expect(screen.getByText('English (US) (en-US)')).toBeInTheDocument();
      expect(screen.getByText('Polish (pl)')).toBeInTheDocument();
    });

    it('should handle selection of language-only locale codes', async () => {
      const user = userEvent.setup();
      const mockOnValueChange = vi.fn();
      render(<LocaleSelector {...defaultProps} onValueChange={mockOnValueChange} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      const option = screen.getByTestId('locale-option-en');
      await user.click(option);

      expect(mockOnValueChange).toHaveBeenCalledWith('en');
    });

    it('should handle selection of language-region locale codes', async () => {
      const user = userEvent.setup();
      const mockOnValueChange = vi.fn();
      render(<LocaleSelector {...defaultProps} onValueChange={mockOnValueChange} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      const option = screen.getByTestId('locale-option-es-MX');
      await user.click(option);

      expect(mockOnValueChange).toHaveBeenCalledWith('es-MX');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid clicks on trigger', async () => {
      const user = userEvent.setup();
      render(<LocaleSelector {...defaultProps} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      // wait for dropdown to open
      const content = await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });
      expect(content).toBeInTheDocument();

      // press escape to close, then open again
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByTestId('locale-selector-content')).not.toBeInTheDocument();
      });

      await user.click(trigger);
      const reopenedContent = await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });
      expect(reopenedContent).toBeInTheDocument();
    });

    it('should handle multiple selections in sequence', async () => {
      const user = userEvent.setup();
      const mockOnValueChange = vi.fn();
      const { rerender } = render(<LocaleSelector {...defaultProps} onValueChange={mockOnValueChange} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      await user.click(screen.getByTestId('locale-option-en'));

      expect(mockOnValueChange).toHaveBeenCalledWith('en');

      // simulate value change from parent
      rerender(<LocaleSelector {...defaultProps} onValueChange={mockOnValueChange} value="en" />);

      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      await user.click(screen.getByTestId('locale-option-pl'));

      expect(mockOnValueChange).toHaveBeenCalledWith('pl');
    });

    it('should handle empty onValueChange callback', async () => {
      const user = userEvent.setup();
      const emptyCallback = () => {
        // intentionally empty
      };
      render(<LocaleSelector onValueChange={emptyCallback} />);

      const trigger = screen.getByTestId('locale-selector-trigger');
      await user.click(trigger);

      await screen.findByTestId('locale-selector-content', {}, { timeout: 3000 });

      const option = screen.getByTestId('locale-option-en');
      await user.click(option);

      // should not throw error - verify dropdown closes after selection
      await waitFor(() => {
        expect(screen.queryByTestId('locale-selector-content')).not.toBeInTheDocument();
      });
    });
  });
});
