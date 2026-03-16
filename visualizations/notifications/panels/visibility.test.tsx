import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisibilityPanel from './visibility';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ domains: [] }) }),
  ));
});

describe('Notifications VisibilityPanel', () => {
  it('renders group blocks from 2-level conditions', async () => {
    render(
      <VisibilityPanel
        config={{
          maxNotifications: 5,
          visibilityConditions: {
            operator: 'AND',
            conditions: [
              { operator: 'AND', conditions: [{ entity_id: 'light.x', operator: 'equals', value: 'on' }] },
            ],
          },
        }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('normalizes old flat conditions to 2-level on load', async () => {
    render(
      <VisibilityPanel
        config={{
          maxNotifications: 5,
          visibilityConditions: {
            operator: 'AND',
            conditions: [{ entity_id: 'light.x', operator: 'equals', value: 'on' }],
          },
        }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    // Bare Condition wrapped into Group 1 — no crash
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('saving calls onConfigChange with updated visibilityConditions', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    render(
      <VisibilityPanel
        config={{ maxNotifications: 5, visibilityConditions: { operator: 'AND', conditions: [] } }}
        onConfigChange={onConfigChange}
        moduleId={1}
      />,
    );
    await user.click(screen.getByText('Save'));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ visibilityConditions: expect.any(Object) }),
    );
  });

  it('cancel does not call onConfigChange', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    render(
      <VisibilityPanel
        config={{ maxNotifications: 5, visibilityConditions: { operator: 'AND', conditions: [] } }}
        onConfigChange={onConfigChange}
        moduleId={1}
      />,
    );
    await user.click(screen.getByText('Cancel'));
    expect(onConfigChange).not.toHaveBeenCalled();
  });
});
