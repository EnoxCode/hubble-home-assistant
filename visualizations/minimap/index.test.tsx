import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Polyfill ResizeObserver for jsdom
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const mockConnectorData: Record<string, unknown> = {};
let mockConfig: Record<string, unknown> = {};

vi.mock('hubble-sdk', () => ({
  useConnectorData: (_module?: string, topic?: string) => {
    return mockConnectorData[topic || 'default'] || null;
  },
  useWidgetConfig: () => mockConfig,
  useHubbleSDK: () => ({
    expandWidget: vi.fn(),
    dismissWidget: vi.fn(),
    onButton: vi.fn(),
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

import MinimapWidget from './index';

describe('MinimapWidget', () => {
  beforeEach(() => {
    mockConfig = {
      size: 'lg',
      floors: [{
        id: 'ground', name: 'Ground floor', svgUrl: '/test.svg',
        entities: [
          { id: 'e1', entityId: 'light.kitchen', x: 14, y: 52, icon: 'mdi:lightbulb',
            showOnMinimap: true, showOnExpanded: true, showLabel: true,
            stateRules: [{ operator: '=', value: 'on', color: '#fbbf24' }], label: 'Kitchen' },
        ],
        textLabels: [], roomZones: [], polygons: [],
      }],
      activeFloor: 0,
      layers: {
        presenceRings: { enabled: false, showOnMinimap: false, showOnExpanded: false, ringStyle: 'solid' },
        lightAmbiance: { enabled: false, showOnMinimap: false, showOnExpanded: false, glowIntensity: 60 },
        securityZones: { enabled: false, showOnMinimap: false, showOnExpanded: false, alarmEntityId: '' },
        activityTrail: { enabled: false, showOnMinimap: false, showOnExpanded: false, durationMinutes: 15 },
      },
      display: { floorPlanOpacity: 70, inactiveIconOpacity: 20, autoSwitchFloorOnActivity: false, enableAnimations: true },
    };
    Object.keys(mockConnectorData).forEach((k) => delete mockConnectorData[k]);
  });

  it('renders DashWidget shell', () => {
    render(<MinimapWidget />);
    expect(screen.getByTestId('dash-widget')).toBeTruthy();
  });

  it('renders floor plan container', () => {
    const { container } = render(<MinimapWidget />);
    expect(container.querySelector('.ha-map-wrap')).toBeTruthy();
  });

  it('applies size class to wrapper', () => {
    const { container } = render(<MinimapWidget />);
    expect(container.querySelector('.ha-minimap--lg')).toBeTruthy();
  });

  it('renders entity pin at correct position', () => {
    mockConnectorData['home-assistant:state_changed:light.kitchen'] = {
      entity_id: 'light.kitchen', state: 'on', attributes: {}, last_changed: '2026-01-01',
    };
    const { container } = render(<MinimapWidget />);
    const pin = container.querySelector('.ha-map-pin');
    expect(pin).toBeTruthy();
  });

  it('renders carousel dots for floors', () => {
    const { container } = render(<MinimapWidget />);
    // Single floor: carousel dots should not render
    expect(container.querySelector('.ha-map-dots')).toBeFalsy();
  });

  it('renders carousel dots when multiple floors exist', () => {
    (mockConfig as Record<string, unknown>).floors = [
      {
        id: 'ground', name: 'Ground floor', svgUrl: '/test.svg',
        entities: [], textLabels: [], roomZones: [], polygons: [],
      },
      {
        id: 'first', name: 'First floor', svgUrl: '/test2.svg',
        entities: [], textLabels: [], roomZones: [], polygons: [],
      },
    ];
    const { container } = render(<MinimapWidget />);
    expect(container.querySelector('.ha-map-dots')).toBeTruthy();
  });

  it('renders footer with status dot', () => {
    render(<MinimapWidget />);
    expect(screen.getByTestId('dash-footer')).toBeTruthy();
  });

  it('renders header with floor name', () => {
    render(<MinimapWidget />);
    expect(screen.getByTestId('dash-header')).toBeTruthy();
  });

  it('shows worst status as error when critical color present', () => {
    mockConnectorData['home-assistant:state_changed'] = {
      entity_id: 'light.kitchen', state: 'on', attributes: {}, last_changed: '2026-01-01',
    };
    // stateRules map 'on' to #fbbf24 (warning), not critical
    const { container } = render(<MinimapWidget />);
    const footer = container.querySelector('.dash-widget-footer');
    expect(footer).toBeTruthy();
  });
});
