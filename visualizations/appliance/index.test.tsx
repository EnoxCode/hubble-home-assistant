import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

/* ── entity data type ── */
interface StateChangePayload {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

/* ── mock state ── */
let mockConfig: Record<string, unknown> = {};
let mockConnectorData: StateChangePayload | null = null;
const mockRequestLatestData = vi.fn<(m: string, t: string) => Promise<unknown>>();

vi.mock('hubble-sdk', () => ({
  useWidgetConfig: () => mockConfig,
  useConnectorData: () => mockConnectorData,
  useHubbleSDK: () => ({ requestLatestData: mockRequestLatestData }),
}));

vi.mock('../../shared/mdi-utils', () => ({
  getMdiPath: (n: string) => (n ? `path-for-${n}` : ''),
}));

import ApplianceWidget from './index';

/* ── helpers ── */
function makeEntity(
  entityId: string,
  state: string,
  attrs: Record<string, unknown> = {},
): StateChangePayload {
  return {
    entity_id: entityId,
    state,
    attributes: { friendly_name: entityId, ...attrs },
    last_changed: '2026-03-16T00:00:00Z',
  };
}

function setupEntityStates(entityMap: Record<string, StateChangePayload>) {
  mockRequestLatestData.mockImplementation((_mod: string, topic: string) => {
    const eid = topic.replace('home-assistant:state_changed:', '');
    const data = entityMap[eid] ?? null;
    return Promise.resolve(data);
  });
}

async function renderAndFlush(ui: React.ReactElement) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(ui);
  });
  return result!;
}

const baseConfig = {
  name: 'Steam Oven',
  icon: 'mdi:stove',
  statusEntity: 'sensor.oven_status',
  statusRules: [
    { operator: '=' as const, value: 'In use', color: '#4ade80', label: 'In use' },
    { operator: '=' as const, value: 'Off', color: 'rgba(255,255,255,0.12)', label: 'Off' },
  ],
  metricCells: [
    { label: 'Temp', entityId: 'sensor.oven_temp' },
    { label: 'Time', entityId: 'sensor.oven_duration' },
    { label: 'Phase', entityId: 'sensor.oven_phase' },
  ],
  progressSource: 'sensor.oven_progress',
  secondaryEntities: [{ entityId: 'sensor.oven_program' }],
  warnings: [
    {
      entityId: 'binary_sensor.oven_door',
      icon: 'mdi:door-open',
      label: 'Door is open',
      severity: 'warning' as const,
      visibilityConditions: {
        operator: 'AND' as const,
        conditions: [
          { entity_id: 'binary_sensor.oven_door', operator: 'equals' as const, value: 'on' },
        ],
      },
    },
  ],
};

const allEntities: Record<string, StateChangePayload> = {
  'sensor.oven_status': makeEntity('sensor.oven_status', 'In use'),
  'sensor.oven_temp': makeEntity('sensor.oven_temp', '180', { unit_of_measurement: '°C' }),
  'sensor.oven_duration': makeEntity('sensor.oven_duration', '25 min'),
  'sensor.oven_phase': makeEntity('sensor.oven_phase', 'Preheat'),
  'sensor.oven_progress': makeEntity('sensor.oven_progress', '65'),
  'sensor.oven_program': makeEntity('sensor.oven_program', 'Convection Bake', {
    friendly_name: 'Convection Bake',
  }),
  'binary_sensor.oven_door': makeEntity('binary_sensor.oven_door', 'off'),
};

/* ── tests ── */
describe('ApplianceWidget', () => {
  beforeEach(() => {
    mockConfig = { ...baseConfig };
    mockConnectorData = null;
    mockRequestLatestData.mockReset();
    setupEntityStates(allEntities);
  });

  it('renders metric strip with 3 cells when running', async () => {
    const { container } = await renderAndFlush(<ApplianceWidget />);

    const cells = container.querySelectorAll('.ha-appliance-cell');
    expect(cells).toHaveLength(3);
    expect(cells[0].querySelector('.ha-appliance-cell-label')?.textContent).toBe('TEMP');
    expect(cells[1].querySelector('.ha-appliance-cell-label')?.textContent).toBe('TIME');
    expect(cells[2].querySelector('.ha-appliance-cell-label')?.textContent).toBe('PHASE');
  });

  it('renders single metric cell', async () => {
    mockConfig = {
      ...baseConfig,
      metricCells: [{ label: 'Temp', entityId: 'sensor.oven_temp' }],
    };

    const { container } = await renderAndFlush(<ApplianceWidget />);

    const cells = container.querySelectorAll('.ha-appliance-cell');
    expect(cells).toHaveLength(1);
  });

  it('collapses to header-only when status resolves to neutral/off', async () => {
    const offEntities = {
      ...allEntities,
      'sensor.oven_status': makeEntity('sensor.oven_status', 'Off'),
    };
    setupEntityStates(offEntities);

    const { container } = await renderAndFlush(<ApplianceWidget />);

    expect(container.querySelector('.ha-appliance-strip')).toBeNull();
  });

  it('shows progress bar when progressSource is configured', async () => {
    const { container } = await renderAndFlush(<ApplianceWidget />);

    const fill = container.querySelector('.ha-appliance-progress-fill') as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe('65%');
  });

  it('hides progress bar when progressSource is none', async () => {
    mockConfig = { ...baseConfig, progressSource: 'none' };

    const { container } = await renderAndFlush(<ApplianceWidget />);

    expect(container.querySelector('.ha-appliance-progress')).toBeNull();
  });

  it('renders warning banner when visibility condition is met', async () => {
    const doorOpen = {
      ...allEntities,
      'binary_sensor.oven_door': makeEntity('binary_sensor.oven_door', 'on'),
    };
    setupEntityStates(doorOpen);

    const { container } = await renderAndFlush(<ApplianceWidget />);

    const warning = container.querySelector('.ha-appliance-warning');
    expect(warning).toBeTruthy();
    expect(warning?.textContent).toContain('Door is open');
  });

  it('hides warning when visibility condition is not met', async () => {
    const { container } = await renderAndFlush(<ApplianceWidget />);

    expect(container.querySelector('.ha-appliance-warning')).toBeNull();
  });

  it('renders secondary details', async () => {
    const { container } = await renderAndFlush(<ApplianceWidget />);

    const secondary = container.querySelector('.ha-appliance-secondary');
    expect(secondary).toBeTruthy();
    expect(secondary?.textContent).toContain('Convection Bake');
  });

  it('sets statusBorder prop to positive for running state', async () => {
    const { container } = await renderAndFlush(<ApplianceWidget />);

    const widget = container.querySelector('[data-status-border]');
    expect(widget?.getAttribute('data-status-border')).toBe('positive');
  });

  it('sets statusBorder to neutral for off state', async () => {
    const offEntities = {
      ...allEntities,
      'sensor.oven_status': makeEntity('sensor.oven_status', 'Off'),
    };
    setupEntityStates(offEntities);

    const { container } = await renderAndFlush(<ApplianceWidget />);

    const widget = container.querySelector('[data-status-border]');
    expect(widget?.getAttribute('data-status-border')).toBe('neutral');
  });

  it('renders no strip when metricCells is empty', async () => {
    mockConfig = { ...baseConfig, metricCells: [] };

    const { container } = await renderAndFlush(<ApplianceWidget />);

    expect(container.querySelector('.ha-appliance-strip')).toBeNull();
  });

  it('caps warnings at 3 and shows overflow text', async () => {
    const manyWarnings = Array.from({ length: 5 }, (_, i) => ({
      entityId: `binary_sensor.warn_${i}`,
      icon: 'mdi:alert',
      label: `Warning ${i}`,
      severity: 'warning' as const,
      visibilityConditions: {
        operator: 'AND' as const,
        conditions: [
          { entity_id: `binary_sensor.warn_${i}`, operator: 'equals' as const, value: 'on' },
        ],
      },
    }));
    mockConfig = { ...baseConfig, warnings: manyWarnings };

    const warnEntities: Record<string, StateChangePayload> = { ...allEntities };
    for (let i = 0; i < 5; i++) {
      warnEntities[`binary_sensor.warn_${i}`] = makeEntity(`binary_sensor.warn_${i}`, 'on');
    }
    setupEntityStates(warnEntities);

    const { container } = await renderAndFlush(<ApplianceWidget />);

    const warnings = container.querySelectorAll('.ha-appliance-warning');
    expect(warnings).toHaveLength(3);
    expect(container.textContent).toContain('+2 more warning');
  });
});
