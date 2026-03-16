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
}));

import PillWidget from './index';

describe('PillWidget', () => {
  beforeEach(() => {
    mockConfig = {
      entityId: 'alarm_control_panel.home',
      friendlyName: 'Alarm',
      variant: 'glass',
      size: 'sm',
      stateMap: [
        { state: 'armed_away', icon: 'mdi:shield-lock', color: '#4ade80' },
        { state: 'triggered', icon: 'mdi:shield-alert', color: '#f87171' },
      ],
    };
    Object.keys(mockConnectorData).forEach((k) => delete mockConnectorData[k]);
  });

  describe('Glass variant', () => {
    it('renders .ha-pill without --colored class', () => {
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'armed_away',
        attributes: { friendly_name: 'Home Alarm' }, last_changed: '2026-01-01',
      };
      const { container } = render(<PillWidget />);
      const pill = container.querySelector('.ha-pill');
      expect(pill).toBeTruthy();
      expect(pill?.classList.contains('ha-pill--colored')).toBe(false);
    });

    it('shows name · value layout', () => {
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'armed_away',
        attributes: { friendly_name: 'Home Alarm' }, last_changed: '2026-01-01',
      };
      render(<PillWidget />);
      expect(screen.getByText('Alarm')).toBeInTheDocument();
      expect(screen.getByText('·')).toBeInTheDocument();
      expect(screen.getByText('armed_away')).toBeInTheDocument();
    });

    it('sets --ha-state-color CSS variable from stateMap color', () => {
      mockConfig.stateMap = [{ state: 'armed_away', icon: 'mdi:shield-lock', color: '#4ade80' }];
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'armed_away', attributes: {}, last_changed: '2026-01-01',
      };
      const { container } = render(<PillWidget />);
      const pill = container.querySelector('.ha-pill') as HTMLElement;
      expect(pill?.style.getPropertyValue('--ha-state-color')).toBe('#4ade80');
    });
  });

  describe('Colored variant', () => {
    it('renders --colored class and sets CSS variable', () => {
      mockConfig.variant = 'colored';
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'triggered', attributes: {}, last_changed: '2026-01-01',
      };
      const { container } = render(<PillWidget />);
      const pill = container.querySelector('.ha-pill') as HTMLElement;
      expect(pill?.classList.contains('ha-pill--colored')).toBe(true);
      expect(pill?.style.getPropertyValue('--ha-state-color')).toBe('#f87171');
    });
  });

  describe('Size', () => {
    it('renders --lg class for large size', () => {
      mockConfig.size = 'lg';
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'armed_away', attributes: {}, last_changed: '2026-01-01',
      };
      const { container } = render(<PillWidget />);
      expect(container.querySelector('.ha-pill--lg')).toBeTruthy();
    });

    it('does not render --lg for sm size', () => {
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'armed_away', attributes: {}, last_changed: '2026-01-01',
      };
      const { container } = render(<PillWidget />);
      expect(container.querySelector('.ha-pill--lg')).toBeFalsy();
    });
  });

  describe('MDI icon', () => {
    it('renders MDI icon SVG from stateMap when state matches', () => {
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'armed_away', attributes: {}, last_changed: '2026-01-01',
      };
      const { container } = render(<PillWidget />);
      const iconWrapper = container.querySelector('.ha-pill-icon');
      expect(iconWrapper).toBeTruthy();
      // @mdi/react renders an SVG element inside the icon wrapper
      expect(iconWrapper?.querySelector('svg')).toBeTruthy();
    });
  });

  describe('Fallback name', () => {
    it('uses HA friendly_name when friendlyName config is not set', () => {
      mockConfig.friendlyName = undefined;
      mockConnectorData['home-assistant:state_changed:alarm_control_panel.home'] = {
        entity_id: 'alarm_control_panel.home', state: 'armed_away',
        attributes: { friendly_name: 'Home Alarm' }, last_changed: '2026-01-01',
      };
      render(<PillWidget />);
      expect(screen.getByText('Home Alarm')).toBeInTheDocument();
    });
  });

  describe('Visibility', () => {
    it('hidden when visibility conditions evaluate to false', () => {
      mockConfig.visibilityConditions = {
        operator: 'AND',
        conditions: [{ entity_id: 'binary_sensor.door', operator: 'equals', value: 'on' }],
      };
      mockConnectorData['home-assistant:state_changed'] = {
        entity_id: 'binary_sensor.door', state: 'off', attributes: {}, last_changed: '2026-01-01',
      };
      const { container } = render(<PillWidget />);
      expect(container.querySelector('.ha-pill')).toBeFalsy();
    });
  });
});
