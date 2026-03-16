import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigurePanel from './configure';
import type { ApplianceConfig } from '../../../shared/types';

const emptyConfig: ApplianceConfig = {
  name: '',
  icon: 'mdi:cog',
  statusRules: [],
  metricCells: [],
  progressSource: 'none',
  secondaryEntities: [],
  warnings: [],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ domains: [] }),
    }),
  ));
});

describe('ConfigurePanel', () => {
  it('renders all preset chips', async () => {
    render(
      <ConfigurePanel config={emptyConfig} onConfigChange={vi.fn()} moduleId={1} />,
    );

    expect(screen.getByText('Oven')).toBeInTheDocument();
    expect(screen.getByText('Washing Machine')).toBeInTheDocument();
    expect(screen.getByText('3D Printer')).toBeInTheDocument();
    expect(screen.getByText('Laser')).toBeInTheDocument();
    expect(screen.getByText('Dishwasher')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();

    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('clicking a preset calls onConfigChange with that preset defaults', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();

    render(
      <ConfigurePanel config={emptyConfig} onConfigChange={onConfigChange} moduleId={1} />,
    );

    await user.click(screen.getByText('Oven'));

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Oven',
      icon: 'mdi:stove',
    }));
  });

  it('clicking Washing Machine preset calls onConfigChange with washer defaults', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();

    render(
      <ConfigurePanel config={emptyConfig} onConfigChange={onConfigChange} moduleId={1} />,
    );

    await user.click(screen.getByText('Washing Machine'));

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Washing Machine',
      icon: 'mdi:washing-machine',
    }));
  });

  it('clicking "+ Add Metric Cell" adds an empty cell', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();

    render(
      <ConfigurePanel config={emptyConfig} onConfigChange={onConfigChange} moduleId={1} />,
    );

    await user.click(screen.getByText('+ Add Metric Cell'));

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      metricCells: [{ label: '', entityId: '' }],
    }));

    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('clicking remove on a metric cell removes it', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();

    const configWithCell: ApplianceConfig = {
      ...emptyConfig,
      metricCells: [{ label: 'Temp', entityId: 'sensor.temp' }],
    };

    render(
      <ConfigurePanel config={configWithCell} onConfigChange={onConfigChange} moduleId={1} />,
    );

    const removeButtons = screen.getAllByTitle('Remove cell');
    await user.click(removeButtons[0]);

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      metricCells: [],
    }));
  });

  it('does not show "+ Add Metric Cell" when 4 cells exist', async () => {
    const configWithFourCells: ApplianceConfig = {
      ...emptyConfig,
      metricCells: [
        { label: 'A', entityId: 'sensor.a' },
        { label: 'B', entityId: 'sensor.b' },
        { label: 'C', entityId: 'sensor.c' },
        { label: 'D', entityId: 'sensor.d' },
      ],
    };

    render(
      <ConfigurePanel config={configWithFourCells} onConfigChange={vi.fn()} moduleId={1} />,
    );

    expect(screen.queryByText('+ Add Metric Cell')).not.toBeInTheDocument();

    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('clicking "+ Add Warning Rule" adds an empty warning', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();

    render(
      <ConfigurePanel config={emptyConfig} onConfigChange={onConfigChange} moduleId={1} />,
    );

    await user.click(screen.getByText('+ Add Warning Rule'));

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
      warnings: [expect.objectContaining({
        entityId: '',
        label: '',
        severity: 'warning',
      })],
    }));
  });
});
