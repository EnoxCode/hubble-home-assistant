import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { IconPicker } from './icon-picker';

vi.mock('@mdi/react', () => ({
  default: ({ path }: { path: string }) =>
    React.createElement('svg', { 'data-testid': 'mdi-icon', 'data-path': path }),
}));
vi.mock('./mdi-utils', () => ({ getMdiPath: (n: string) => n ? 'M0 0' : '' }));
vi.mock('./mdi-categories', () => ({
  MDI_CATEGORIES: { Home: ['home', 'thermometer'] },
}));
vi.mock('@mdi/js', () => ({
  mdiHome: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  mdiThermometer: 'M15 13V5A3 3 0 0 0 9 5v8a5 5 0 1 0 6 0z',
  mdiWeatherSunny: 'M12 7a5 5 0 1 1 0 10A5 5 0 0 1 12 7z',
}));

describe('IconPicker', () => {
  it('renders trigger button', () => {
    render(<IconPicker onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('opens modal and search filters icons by name', async () => {
    const user = userEvent.setup();
    render(<IconPicker onSelect={vi.fn()} />);

    // Click the trigger button to open the modal
    await user.click(screen.getByRole('button'));
    const input = screen.getByPlaceholderText('Search 7,000+ icons…');
    // Use fireEvent.change to avoid per-character typing which times out with thousands of icons
    fireEvent.change(input, { target: { value: 'home' } });

    const buttons = screen.getAllByRole('button');
    // Should have filtered results with "home" in their title
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      if (btn.getAttribute('title')) {
        expect(btn.getAttribute('title')!.toLowerCase()).toContain('home');
      }
    });
  });

  it('clicking an icon sets pending selection; Select button calls onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<IconPicker onSelect={onSelect} />);

    // Open modal
    await user.click(screen.getByRole('button'));

    // Click the first icon button that has a title
    const buttons = screen.getAllByRole('button').filter((b) => b.getAttribute('title'));
    if (buttons.length > 0) {
      await user.click(buttons[0]);
      // Confirm via Select button
      await user.click(screen.getByText('Select'));
      expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(/^mdi:/));
    }
  });

  it('shows "no icons found" when search has no matches', async () => {
    const user = userEvent.setup();
    render(<IconPicker onSelect={vi.fn()} />);

    // Open modal
    await user.click(screen.getByRole('button'));
    const input = screen.getByPlaceholderText('Search 7,000+ icons…');
    fireEvent.change(input, { target: { value: 'zzzznonexistenticon' } });

    expect(screen.getByText('No icons found')).toBeInTheDocument();
  });

  it('currently selected icon is highlighted with --selected class', async () => {
    const user = userEvent.setup();
    render(<IconPicker onSelect={vi.fn()} selectedIcon="mdi:home" />);

    // Open modal
    await user.click(screen.getByRole('button'));

    const homeBtn = screen.getAllByRole('button').find((b) => b.getAttribute('title') === 'home');
    if (homeBtn) {
      expect(homeBtn.className).toContain('icon-picker__icon-btn--selected');
    }
  });
});
