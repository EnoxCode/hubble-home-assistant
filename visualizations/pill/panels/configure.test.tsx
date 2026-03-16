import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigurePanel from './configure';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        domains: [{
          domain: 'light',
          entities: [{ entity_id: 'light.living', state: 'on', friendly_name: 'Living Room' }],
        }],
      }),
    }),
  ));
});

describe('ConfigurePanel', () => {
  it('renders entity chip with placeholder when no entity selected', async () => {
    render(
      <ConfigurePanel
        config={{ entityId: '', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    expect(screen.getByText('Pick an entity...')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('renders entity chip with friendly name when entity is selected', async () => {
    render(
      <ConfigurePanel
        config={{ entityId: 'light.living', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    await waitFor(() => expect(screen.getByText('Living Room')).toBeInTheDocument());
  });

  it('clicking entity chip opens the picker modal', async () => {
    const user = userEvent.setup();
    render(
      <ConfigurePanel
        config={{ entityId: '', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );

    await user.click(screen.getByText('Pick an entity...'));
    await waitFor(() => expect(screen.getByPlaceholderText('Search by name or entity ID…')).toBeInTheDocument());
  });

  it('selecting an entity calls onConfigChange immediately', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    render(
      <ConfigurePanel
        config={{ entityId: '', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={onConfigChange}
        moduleId={1}
      />,
    );

    await user.click(screen.getByText('Pick an entity...'));
    await waitFor(() => expect(screen.getByText('Living Room')).toBeInTheDocument());
    await user.click(screen.getByText('Living Room'));

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'light.living' }));
  });

  it('renders display name text input', async () => {
    render(
      <ConfigurePanel
        config={{ entityId: 'light.living', friendlyName: 'My Light', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    const input = screen.getByPlaceholderText('Leave blank to use HA name') as HTMLInputElement;
    expect(input.value).toBe('My Light');
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('renders variant and size selectors', async () => {
    render(
      <ConfigurePanel
        config={{ entityId: '', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    expect(screen.getByText('Glass (subtle)')).toBeInTheDocument();
    expect(screen.getByText('Small (dense layouts)')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });
});
