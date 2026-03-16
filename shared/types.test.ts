import { describe, it, expect } from 'vitest';
import { evaluateConditions, ConditionGroup } from './types';

describe('evaluateConditions', () => {
  it('returns true when no conditions configured', () => {
    expect(evaluateConditions(undefined, new Map())).toBe(true);
  });

  it('returns true when conditions array is empty', () => {
    const group: ConditionGroup = { operator: 'AND', conditions: [] };
    expect(evaluateConditions(group, new Map())).toBe(true);
  });

  it('AND group: all conditions must pass', () => {
    const states = new Map([['light.living', 'on'], ['sensor.temp', '22']]);
    const group: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { entity_id: 'light.living', operator: 'equals', value: 'on' },
        { entity_id: 'sensor.temp', operator: 'equals', value: '22' },
      ],
    };
    expect(evaluateConditions(group, states)).toBe(true);

    const failGroup: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { entity_id: 'light.living', operator: 'equals', value: 'on' },
        { entity_id: 'sensor.temp', operator: 'equals', value: '25' },
      ],
    };
    expect(evaluateConditions(failGroup, states)).toBe(false);
  });

  it('OR group: any condition can pass', () => {
    const states = new Map([['light.living', 'off'], ['sensor.temp', '22']]);
    const group: ConditionGroup = {
      operator: 'OR',
      conditions: [
        { entity_id: 'light.living', operator: 'equals', value: 'on' },
        { entity_id: 'sensor.temp', operator: 'equals', value: '22' },
      ],
    };
    expect(evaluateConditions(group, states)).toBe(true);
  });

  it('nested: top-level AND with OR sub-group', () => {
    const states = new Map([['light.living', 'on'], ['binary_sensor.door', 'off'], ['sensor.temp', '22']]);
    const group: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { entity_id: 'light.living', operator: 'equals', value: 'on' },
        {
          operator: 'OR',
          conditions: [
            { entity_id: 'binary_sensor.door', operator: 'equals', value: 'on' },
            { entity_id: 'sensor.temp', operator: 'equals', value: '22' },
          ],
        },
      ],
    };
    expect(evaluateConditions(group, states)).toBe(true);
  });

  it('"equals" operator matches exact state value', () => {
    const states = new Map([['light.living', 'on']]);
    const group: ConditionGroup = {
      operator: 'AND',
      conditions: [{ entity_id: 'light.living', operator: 'equals', value: 'on' }],
    };
    expect(evaluateConditions(group, states)).toBe(true);
  });

  it('"not_equals" operator rejects matching state', () => {
    const states = new Map([['light.living', 'on']]);
    const group: ConditionGroup = {
      operator: 'AND',
      conditions: [{ entity_id: 'light.living', operator: 'not_equals', value: 'on' }],
    };
    expect(evaluateConditions(group, states)).toBe(false);
  });

  it('"contains" operator matches substring', () => {
    const states = new Map([['sensor.weather', 'partly cloudy']]);
    const group: ConditionGroup = {
      operator: 'AND',
      conditions: [{ entity_id: 'sensor.weather', operator: 'contains', value: 'cloudy' }],
    };
    expect(evaluateConditions(group, states)).toBe(true);
  });

  it('"not_contains" operator rejects substring match', () => {
    const states = new Map([['sensor.weather', 'partly cloudy']]);
    const group: ConditionGroup = {
      operator: 'AND',
      conditions: [{ entity_id: 'sensor.weather', operator: 'not_contains', value: 'cloudy' }],
    };
    expect(evaluateConditions(group, states)).toBe(false);
  });

  it('"is_empty" operator matches empty/missing state', () => {
    const states = new Map<string, string>();
    const group: ConditionGroup = {
      operator: 'AND',
      conditions: [{ entity_id: 'sensor.unknown', operator: 'is_empty' }],
    };
    expect(evaluateConditions(group, states)).toBe(true);

    const statesWithEmpty = new Map([['sensor.unknown', '']]);
    expect(evaluateConditions(group, statesWithEmpty)).toBe(true);
  });
});
