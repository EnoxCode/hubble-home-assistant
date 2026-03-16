import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityPicker } from './entity-picker';

const mockDomains = {
  domains: [
    {
      domain: 'light',
      entities: [
        { entity_id: 'light.living', state: 'on', friendly_name: 'Living Room Light' },
        { entity_id: 'light.bedroom', state: 'off', friendly_name: 'Bedroom Light' },
      ],
    },
    {
      domain: 'sensor',
      entities: [
        { entity_id: 'sensor.temp', state: '22', friendly_name: 'Temperature' },
      ],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockDomains) }),
  ));
});

describe('EntityPicker', () => {
  it('renders entities grouped by domain', async () => {
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => {
      // domain name appears in both chip and list label
      expect(screen.getAllByText('light').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('sensor').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Living Room Light')).toBeInTheDocument();
      expect(screen.getByText('Temperature')).toBeInTheDocument();
    });
  });

  it('shows entity_id below friendly name in each row', async () => {
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('light.living')).toBeInTheDocument());
    expect(screen.getByText('sensor.temp')).toBeInTheDocument();
  });

  it('shows current state for each entity', async () => {
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('on')).toBeInTheDocument();
      expect(screen.getByText('off')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument();
    });
  });

  it('shows checkmark next to selectedEntityId', async () => {
    render(<EntityPicker moduleId={1} selectedEntityId="light.living" onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('entity-selected-light.living')).toBeInTheDocument());
  });

  it('search filters by friendly_name', async () => {
    const user = userEvent.setup();
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Living Room Light')).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Search by name or entity ID…'), 'bedroom');

    expect(screen.getByText('Bedroom Light')).toBeInTheDocument();
    expect(screen.queryByText('Living Room Light')).not.toBeInTheDocument();
  });

  it('search filters by entity_id', async () => {
    const user = userEvent.setup();
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Living Room Light')).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Search by name or entity ID…'), 'sensor.temp');

    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.queryByText('Living Room Light')).not.toBeInTheDocument();
  });

  it('shows "No results" when search has no matches', async () => {
    const user = userEvent.setup();
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Living Room Light')).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Search by name or entity ID…'), 'zzznomatch');

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('domain chip filters list to that domain', async () => {
    const user = userEvent.setup();
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Living Room Light')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'light' }));

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.queryByText('Temperature')).not.toBeInTheDocument();
  });

  it('clicking an entity calls onSelect with entity_id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EntityPicker moduleId={1} onSelect={onSelect} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Living Room Light')).toBeInTheDocument());
    await user.click(screen.getByText('Living Room Light'));

    expect(onSelect).toHaveBeenCalledWith('light.living');
  });

  it('pressing Esc calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking backdrop calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByTestId('entity-picker-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state while fetching', () => {
    // fetch never resolves in this test
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId('entity-picker-loading')).toBeInTheDocument();
  });

  it('shows error state and retry button on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    render(<EntityPicker moduleId={1} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Failed to load entities')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
