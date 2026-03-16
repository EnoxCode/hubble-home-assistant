import { describe, it, expect } from 'vitest';
import { resolveStateColor, detectSeverity, evaluateStateRule, resolveStateRules } from './state-utils';
import type { StateRule } from './types';

describe('resolveStateColor', () => {
  const defaultMap = [
    { state: 'on', icon: 'mdi-lightbulb', color: '#4ade80' },
    { state: 'off', icon: 'mdi-lightbulb-outline', color: 'rgba(255,255,255,0.85)' },
    { state: 'locked', icon: 'mdi-lock', color: 'rgba(255,255,255,0.85)' },
    { state: 'unlocked', icon: 'mdi-lock-open-variant', color: '#fbbf24' },
  ];

  it('returns first matching entry from stateMap', () => {
    const result = resolveStateColor('on', defaultMap);
    expect(result).toEqual({ icon: 'mdi-lightbulb', color: '#4ade80' });
  });

  it('returns null when no match found', () => {
    expect(resolveStateColor('unavailable', defaultMap)).toBeNull();
  });

  it('returns null for empty stateMap', () => {
    expect(resolveStateColor('on', [])).toBeNull();
  });

  it('uses first match when multiple entries match', () => {
    const map = [
      { state: 'on', icon: 'mdi-a', color: 'positive' },
      { state: 'on', icon: 'mdi-b', color: 'warning' },
    ];
    expect(resolveStateColor('on', map)?.icon).toBe('mdi-a');
  });
});

describe('detectSeverity', () => {
  it('returns critical when title contains alarm', () => {
    expect(detectSeverity('Alarm triggered', 'Details')).toBe('critical');
  });

  it('returns warning when title contains warning (case-insensitive)', () => {
    expect(detectSeverity('Warning: low battery', '')).toBe('warning');
  });

  it('returns critical when title contains triggered', () => {
    expect(detectSeverity('Motion triggered', '')).toBe('critical');
  });

  it('returns neutral for normal notifications', () => {
    expect(detectSeverity('Cleanup completed', 'All good')).toBe('neutral');
  });
});

describe('evaluateStateRule', () => {
  const makeRule = (overrides: Partial<StateRule>): StateRule => ({
    operator: '=',
    value: '',
    color: '#4ade80',
    ...overrides,
  });

  it('matches equals operator', () => {
    expect(evaluateStateRule('on', {}, makeRule({ operator: '=', value: 'on' }))).toBe(true);
    expect(evaluateStateRule('off', {}, makeRule({ operator: '=', value: 'on' }))).toBe(false);
  });

  it('matches not-equals operator', () => {
    expect(evaluateStateRule('off', {}, makeRule({ operator: '!=', value: 'on' }))).toBe(true);
  });

  it('matches greater-than operator (numeric)', () => {
    expect(evaluateStateRule('21.5', {}, makeRule({ operator: '>', value: '20' }))).toBe(true);
    expect(evaluateStateRule('19', {}, makeRule({ operator: '>', value: '20' }))).toBe(false);
  });

  it('matches less-than operator', () => {
    expect(evaluateStateRule('15', {}, makeRule({ operator: '<', value: '18' }))).toBe(true);
  });

  it('matches between operator', () => {
    expect(evaluateStateRule('21', {}, makeRule({ operator: 'between', value: '18', valueTo: '24' }))).toBe(true);
    expect(evaluateStateRule('25', {}, makeRule({ operator: 'between', value: '18', valueTo: '24' }))).toBe(false);
  });

  it('matches contains operator', () => {
    expect(evaluateStateRule('alarm_triggered', {}, makeRule({ operator: 'contains', value: 'alarm' }))).toBe(true);
  });

  it('evaluates attribute instead of state when evaluateAttribute is set', () => {
    const attrs = { brightness: 255 };
    const rule = makeRule({ evaluateAttribute: 'brightness', operator: '>', value: '200' });
    expect(evaluateStateRule('on', attrs, rule)).toBe(true);
  });

  it('returns false for non-numeric comparisons with numeric operators', () => {
    expect(evaluateStateRule('hello', {}, makeRule({ operator: '>', value: '20' }))).toBe(false);
  });
});

describe('resolveStateRules', () => {
  it('returns first matching rule (top to bottom)', () => {
    const rules: StateRule[] = [
      { operator: '>', value: '24', color: '#f87171', label: 'Hot' },
      { operator: 'between', value: '18', valueTo: '24', color: '#4ade80', label: 'Good' },
      { operator: '<', value: '18', color: '#60a5fa', label: 'Cold' },
    ];
    const result = resolveStateRules('21', {}, rules);
    expect(result?.color).toBe('#4ade80');
    expect(result?.label).toBe('Good');
  });

  it('returns null when no rule matches', () => {
    const rules: StateRule[] = [
      { operator: '=', value: 'on', color: '#4ade80' },
    ];
    expect(resolveStateRules('off', {}, rules)).toBeNull();
  });
});
