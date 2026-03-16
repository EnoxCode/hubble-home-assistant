import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisibilityPanel from './visibility';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        domains: [{
          domain: 'light',
          entities: [{ entity_id: 'light.test', state: 'on', friendly_name: 'Test Light' }],
        }],
      }),
    }),
  ));
});

describe('VisibilityPanel', () => {
  it('renders with a default group when no conditions provided', async () => {
    render(
      <VisibilityPanel
        config={{ entity_id: 'light.test', title: 'Test', defaultIcon: 'Home', stateMappings: [] }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('renders condition groups from existing visibilityConditions', async () => {
    render(
      <VisibilityPanel
        config={{
          entity_id: 'light.test',
          title: 'Test',
          defaultIcon: 'Home',
          stateMappings: [],
          visibilityConditions: {
            operator: 'AND',
            conditions: [
              { operator: 'OR', conditions: [{ entity_id: 'light.test', operator: 'equals', value: 'on' }] },
              { operator: 'AND', conditions: [] },
            ],
          },
        }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.getByText('Group 2')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('normalizes old flat conditions to 2-level on load', async () => {
    render(
      <VisibilityPanel
        config={{
          entity_id: 'light.test',
          title: 'Test',
          defaultIcon: 'Home',
          stateMappings: [],
          // Old format: bare Condition at top level
          visibilityConditions: {
            operator: 'AND',
            conditions: [{ entity_id: 'light.test', operator: 'equals', value: 'on' }],
          },
        }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    // Old bare condition should be wrapped in a Group 1 block, not crash
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    await waitFor(() => {}); // flush pending fetch microtask
  });

  it('entity chips show friendly name after entities load', async () => {
    render(
      <VisibilityPanel
        config={{
          entity_id: 'light.test',
          title: 'Test',
          defaultIcon: 'Home',
          stateMappings: [],
          visibilityConditions: {
            operator: 'AND',
            conditions: [
              { operator: 'AND', conditions: [{ entity_id: 'light.test', operator: 'equals', value: 'on' }] },
            ],
          },
        }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );
    await waitFor(() => expect(screen.getByText('Test Light')).toBeInTheDocument());
  });

  it('saving calls onConfigChange with updated visibilityConditions', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    render(
      <VisibilityPanel
        config={{ entity_id: 'light.test', title: 'Test', defaultIcon: 'Home', stateMappings: [], visibilityConditions: { operator: 'AND', conditions: [] } }}
        onConfigChange={onConfigChange}
        moduleId={1}
      />,
    );
    await user.click(screen.getByText('Save'));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ visibilityConditions: expect.any(Object) }),
    );
  });

  it('cancel discards changes without calling onConfigChange', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    render(
      <VisibilityPanel
        config={{ entity_id: 'light.test', title: 'Test', defaultIcon: 'Home', stateMappings: [], visibilityConditions: { operator: 'AND', conditions: [] } }}
        onConfigChange={onConfigChange}
        moduleId={1}
      />,
    );
    await user.click(screen.getByText('Cancel'));
    expect(onConfigChange).not.toHaveBeenCalled();
  });
});
