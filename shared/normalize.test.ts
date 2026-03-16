import { describe, it, expect } from 'vitest';
import { normalizeToTwoLevel } from './types';
import type { ConditionGroup } from './types';

describe('normalizeToTwoLevel', () => {
  it('returns already-2-level data unchanged', () => {
    const input: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { operator: 'OR', conditions: [{ entity_id: 'light.x', operator: 'equals', value: 'on' }] },
      ],
    };
    const result = normalizeToTwoLevel(input);
    expect(result).toEqual(input);
  });

  it('wraps top-level bare conditions into an inner group', () => {
    const input: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { entity_id: 'light.x', operator: 'equals', value: 'on' },
        { entity_id: 'sensor.y', operator: 'is_empty' },
      ],
    };
    const result = normalizeToTwoLevel(input);
    expect(result.operator).toBe('AND');
    expect(result.conditions).toHaveLength(1);
    const inner = result.conditions[0] as ConditionGroup;
    expect(inner.conditions).toHaveLength(2);
    expect(inner.operator).toBe('AND'); // preserves original operator
  });

  it('keeps existing inner groups and wraps bare conditions alongside them', () => {
    const input: ConditionGroup = {
      operator: 'OR',
      conditions: [
        { entity_id: 'light.x', operator: 'equals', value: 'on' },
        { operator: 'AND', conditions: [{ entity_id: 'sensor.y', operator: 'is_empty' }] },
      ],
    };
    const result = normalizeToTwoLevel(input);
    expect(result.conditions).toHaveLength(2); // wrapped group + existing inner group
  });
});
