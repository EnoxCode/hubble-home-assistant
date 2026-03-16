import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StateRuleBuilder } from './state-rule-builder';
import type { StateRule } from './types';

describe('StateRuleBuilder', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders "+ Add rule" button when no rules exist', () => {
    render(
      <StateRuleBuilder rules={[]} onChange={onChange} moduleId={1}
        entityMode="implicit" showIcon={false} showLabel={false} showColor={true} />
    );
    expect(screen.getByText('+ Add rule')).toBeInTheDocument();
  });

  it('renders existing rules with operator and value', () => {
    const rules: StateRule[] = [{ operator: '=', value: 'on', color: '#4ade80' }];
    render(
      <StateRuleBuilder rules={rules} onChange={onChange} moduleId={1}
        entityMode="implicit" showIcon={false} showLabel={false} showColor={true} />
    );
    expect(screen.getByDisplayValue('on')).toBeInTheDocument();
  });

  it('adds a new empty rule when "+ Add rule" is clicked', () => {
    render(
      <StateRuleBuilder rules={[]} onChange={onChange} moduleId={1}
        entityMode="implicit" showIcon={false} showLabel={false} showColor={true} />
    );
    fireEvent.click(screen.getByText('+ Add rule'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ operator: '=', value: '', color: '#4ade80' }),
    ]);
  });

  it('shows label input when showLabel is true', () => {
    const rules: StateRule[] = [{ operator: '=', value: 'on', color: '#4ade80', label: 'Active' }];
    render(
      <StateRuleBuilder rules={rules} onChange={onChange} moduleId={1}
        entityMode="implicit" showIcon={false} showLabel={true} showColor={true} />
    );
    expect(screen.getByDisplayValue('Active')).toBeInTheDocument();
  });

  it('shows between inputs when operator is between', () => {
    const rules: StateRule[] = [{ operator: 'between', value: '18', valueTo: '24', color: '#4ade80' }];
    render(
      <StateRuleBuilder rules={rules} onChange={onChange} moduleId={1}
        entityMode="implicit" showIcon={false} showLabel={false} showColor={true} />
    );
    expect(screen.getByDisplayValue('18')).toBeInTheDocument();
    expect(screen.getByDisplayValue('24')).toBeInTheDocument();
  });

  it('shows binding variable selector in bindings mode', () => {
    const rules: StateRule[] = [{ operator: '>', value: '20', color: '#f87171', bindingVariable: 'temp' }];
    render(
      <StateRuleBuilder rules={rules} onChange={onChange} moduleId={1}
        entityMode="bindings"
        bindings={[
          { variable: 'temp', entityId: 'sensor.kitchen_temp' },
          { variable: 'humidity', entityId: 'sensor.kitchen_humidity' },
        ]}
        showIcon={false} showLabel={true} showColor={true} />
    );
    expect(screen.getByText('temp')).toBeInTheDocument();
  });
});
