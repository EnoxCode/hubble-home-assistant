import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisibilityBuilder } from './visibility-builder';
import type { ConditionGroup } from './types';

const mockDomains = {
  domains: [{
    domain: 'light',
    entities: [
      { entity_id: 'light.living', state: 'on', friendly_name: 'Living Room' },
      { entity_id: 'light.bedroom', state: 'off', friendly_name: 'Bedroom' },
    ],
  }],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockDomains) }),
  ));
});

describe('VisibilityBuilder', () => {
  it('renders a default group when no conditions provided', async () => {
    render(<VisibilityBuilder onChange={vi.fn()} moduleId={1} />);
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('renders groups from provided 2-level conditions', async () => {
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'OR', conditions: [{ entity_id: 'light.living', operator: 'equals', value: 'on' }] },
        { operator: 'AND', conditions: [{ entity_id: 'light.bedroom', operator: 'equals', value: 'off' }] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={vi.fn()} moduleId={1} />);
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.getByText('Group 2')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('shows "— and —" divider between two groups', async () => {
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'AND', conditions: [] },
        { operator: 'AND', conditions: [] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={vi.fn()} moduleId={1} />);
    expect(screen.getByTestId('outer-join-divider')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('each group has an ALL/ANY toggle', async () => {
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'OR', conditions: [] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={vi.fn()} moduleId={1} />);
    expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ANY' })).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('toggling ALL/ANY updates group operator', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [{ operator: 'AND', conditions: [] }],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={onChange} moduleId={1} />);

    await user.click(screen.getByRole('button', { name: 'ANY' }));
    const updated = onChange.mock.calls[0][0] as ConditionGroup;
    const inner = updated.conditions[0] as ConditionGroup;
    expect(inner.operator).toBe('OR');
  });

  it('condition row shows entity chip, operator select, value input', async () => {
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'AND', conditions: [{ entity_id: 'light.living', operator: 'equals', value: 'on' }] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={vi.fn()} moduleId={1} />);
    expect(screen.getByDisplayValue('on')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('entity chip shows friendly name after entities load', async () => {
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'AND', conditions: [{ entity_id: 'light.living', operator: 'equals', value: 'on' }] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={vi.fn()} moduleId={1} />);

    await waitFor(() => expect(screen.getByText('Living Room')).toBeInTheDocument());
  });

  it('entity chip shows "Pick entity…" for empty entity_id', async () => {
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'AND', conditions: [{ entity_id: '', operator: 'equals', value: '' }] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={vi.fn()} moduleId={1} />);
    expect(screen.getByText('Pick entity…')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('"is_empty" operator hides value input', async () => {
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'AND', conditions: [{ entity_id: 'light.living', operator: 'is_empty' }] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={vi.fn()} moduleId={1} />);
    expect(screen.queryByPlaceholderText('Value')).not.toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('can add a condition to a group', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [{ operator: 'AND', conditions: [] }],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={onChange} moduleId={1} />);

    await user.click(screen.getByText('+ Add condition'));
    const updated = onChange.mock.calls[0][0] as ConditionGroup;
    const inner = updated.conditions[0] as ConditionGroup;
    expect(inner.conditions).toHaveLength(1);
    expect(inner.conditions[0]).toMatchObject({ entity_id: '', operator: 'equals' });
  });

  it('can remove a condition from a group', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'AND', conditions: [{ entity_id: 'light.living', operator: 'equals', value: 'on' }] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={onChange} moduleId={1} />);

    await user.click(screen.getByLabelText('Remove condition'));
    const updated = onChange.mock.calls[0][0] as ConditionGroup;
    expect((updated.conditions[0] as ConditionGroup).conditions).toHaveLength(0);
  });

  it('can add a new group', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VisibilityBuilder conditions={{ operator: 'AND', conditions: [] }} onChange={onChange} moduleId={1} />);

    await user.click(screen.getByText('+ Add group'));
    const updated = onChange.mock.calls[0][0] as ConditionGroup;
    expect(updated.conditions).toHaveLength(1);
    const inner = updated.conditions[0] as ConditionGroup;
    expect(inner.operator).toBe('AND');
  });

  it('can remove a group', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'AND', conditions: [] },
        { operator: 'OR', conditions: [] },
      ],
    };
    render(<VisibilityBuilder conditions={conditions} onChange={onChange} moduleId={1} />);

    const removeButtons = screen.getAllByLabelText('Remove group');
    await user.click(removeButtons[0]);
    const updated = onChange.mock.calls[0][0] as ConditionGroup;
    expect(updated.conditions).toHaveLength(1);
  });
});
