import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mockConnectorData: Record<string, unknown> = {};
let mockConfig: Record<string, unknown> = {};

vi.mock('hubble-sdk', () => ({
  useConnectorData: (_module?: string, topic?: string) => {
    return mockConnectorData[topic || 'default'] || null;
  },
  useWidgetConfig: () => mockConfig,
  useHubbleSDK: () => ({
    requestLatestData: vi.fn(() => Promise.resolve(null)),
  }),
}));

vi.mock('hubble-dash-ui', () => ({
  DashWidget: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className: `dash-glass dash-widget ${className || ''}`, 'data-testid': 'dash-widget' }, children),
  DashWidgetHeader: ({ label }: { label: string }) =>
    React.createElement('div', { className: 'dash-widget-header', 'data-testid': 'dash-header' },
      React.createElement('span', { className: 't-label' }, label),
    ),
  DashWidgetFooter: ({ status }: { status?: string }) =>
    React.createElement('div', { className: 'dash-widget-footer', 'data-testid': 'dash-footer' },
      React.createElement('span', { className: `dash-status-dot dash-status-dot--${status || 'ok'}` }),
    ),
}));

import ListWidget from './index';

describe('ListWidget', () => {
  beforeEach(() => {
    mockConfig = {
      groupName: 'Doors & Locks',
      entities: ['lock.front_door', 'lock.back_door'],
      displayVariant: 'badge',
      maxItems: 8,
      stateMap: [
        { state: 'locked', icon: 'mdi-lock', color: '#4ade80' },
        { state: 'unlocked', icon: 'mdi-lock-open-variant', color: '#f87171' },
      ],
    };
    Object.keys(mockConnectorData).forEach((k) => delete mockConnectorData[k]);
  });

  it('renders DashWidget shell with group name header', () => {
    render(<ListWidget />);
    expect(screen.getByTestId('dash-widget')).toBeTruthy();
    expect(screen.getByText('Doors & Locks')).toBeInTheDocument();
  });

  it('renders a row for each entity', () => {
    mockConnectorData['home-assistant:state_changed'] = {
      entity_id: 'lock.front_door',
      state: 'locked',
      attributes: { friendly_name: 'Front door' },
      last_changed: '2026-01-01',
    };

    const { container, rerender } = render(<ListWidget />);

    // Simulate second entity arriving
    mockConnectorData['home-assistant:state_changed'] = {
      entity_id: 'lock.back_door',
      state: 'unlocked',
      attributes: { friendly_name: 'Back door' },
      last_changed: '2026-01-01',
    };
    rerender(<ListWidget />);

    expect(container.querySelectorAll('.ha-list-row')).toHaveLength(2);
  });

  describe('Badge variant', () => {
    it('renders badge with state text', () => {
      mockConnectorData['home-assistant:state_changed'] = {
        entity_id: 'lock.front_door',
        state: 'locked',
        attributes: { friendly_name: 'Front door' },
        last_changed: '2026-01-01',
      };

      const { container } = render(<ListWidget />);
      const badge = container.querySelector('.ha-list-badge');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toBe('locked');
    });
  });

  describe('Dot variant', () => {
    it('renders dot + value text', () => {
      mockConfig.displayVariant = 'dot';
      mockConnectorData['home-assistant:state_changed'] = {
        entity_id: 'lock.front_door',
        state: 'locked',
        attributes: { friendly_name: 'Front door' },
        last_changed: '2026-01-01',
      };

      const { container } = render(<ListWidget />);
      const row = container.querySelector('.ha-list-row') as HTMLElement;
      expect(row?.style.getPropertyValue('--ha-state-color')).toBe('#4ade80');
      expect(container.querySelector('.ha-list-dot')).toBeTruthy();
      expect(container.querySelector('.ha-list-value')).toBeTruthy();
    });
  });

  it('status dot reflects worst entity state', () => {
    // First render: front door locked (positive)
    mockConnectorData['home-assistant:state_changed'] = {
      entity_id: 'lock.front_door',
      state: 'locked',
      attributes: { friendly_name: 'Front door' },
      last_changed: '2026-01-01',
    };
    const { container, rerender } = render(<ListWidget />);

    // Second render: back door unlocked (critical)
    mockConnectorData['home-assistant:state_changed'] = {
      entity_id: 'lock.back_door',
      state: 'unlocked',
      attributes: { friendly_name: 'Back door' },
      last_changed: '2026-01-01',
    };
    rerender(<ListWidget />);

    // unlocked maps to #f87171 (critical) → status dot should be error
    expect(container.querySelector('.dash-status-dot--error')).toBeTruthy();
  });

  it('respects maxItems config', () => {
    mockConfig.maxItems = 1;
    mockConnectorData['home-assistant:state_changed'] = {
      entity_id: 'lock.front_door', state: 'locked',
      attributes: { friendly_name: 'Front door' }, last_changed: '2026-01-01',
    };

    const { container } = render(<ListWidget />);
    expect(container.querySelectorAll('.ha-list-row')).toHaveLength(1);
  });
});
