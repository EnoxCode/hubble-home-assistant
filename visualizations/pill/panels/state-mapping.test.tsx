import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StateMappingPanel from './state-mapping';

describe('StateMappingPanel (StateRuleBuilder)', () => {
  it('renders migrated rules from legacy stateMap', () => {
    render(
      <StateMappingPanel
        config={{
          entityId: 'light.test',
          variant: 'glass',
          size: 'sm',
          stateMap: [
            { state: 'on', color: '#4ade80', icon: 'mdi-lightbulb' },
            { state: 'off', color: '#f87171', icon: 'mdi-lightbulb-off' },
          ],
        }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );

    // StateRuleBuilder renders "Rule 1", "Rule 2" headings
    expect(screen.getByText('Rule 1')).toBeInTheDocument();
    expect(screen.getByText('Rule 2')).toBeInTheDocument();
  });

  it('renders with existing stateRules (new format)', () => {
    render(
      <StateMappingPanel
        config={{
          entityId: 'light.test',
          variant: 'glass',
          size: 'sm',
          stateMap: [],
          stateRules: [
            { operator: '=', value: 'on', color: '#4ade80', icon: 'mdi-lightbulb' },
          ],
        }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );

    expect(screen.getByText('Rule 1')).toBeInTheDocument();
  });

  it('shows no rules and add button when stateMap and stateRules are empty', () => {
    render(
      <StateMappingPanel
        config={{ entityId: 'light.test', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={vi.fn()}
        moduleId={1}
      />,
    );

    expect(screen.getByText('+ Add rule')).toBeInTheDocument();
  });

  it('can add a new rule', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();

    render(
      <StateMappingPanel
        config={{ entityId: 'light.test', variant: 'glass', size: 'sm', stateMap: [] }}
        onConfigChange={onConfigChange}
        moduleId={1}
      />,
    );

    await user.click(screen.getByText('+ Add rule'));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stateRules: [expect.objectContaining({ operator: '=', value: '', color: '#4ade80' })],
      }),
    );
  });

  it('can remove a rule', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();

    render(
      <StateMappingPanel
        config={{
          entityId: 'light.test',
          variant: 'glass',
          size: 'sm',
          stateMap: [],
          stateRules: [{ operator: '=', value: 'on', color: '#4ade80' }],
        }}
        onConfigChange={onConfigChange}
        moduleId={1}
      />,
    );

    await user.click(screen.getByLabelText('Remove rule'));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ stateRules: [] }),
    );
  });
});
