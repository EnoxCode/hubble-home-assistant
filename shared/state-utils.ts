import type { StateRule } from './types';

export interface StateMapEntry {
  state: string;
  icon: string;
  color: string; // Hex color (e.g. '#4ade80') or any CSS color value
  label?: string; // Display label override (e.g. 'off' → 'Closed')
}

/** Dashboard design system token presets for ColorPicker */
export const DASH_COLOR_PRESETS = [
  { label: 'Positive', value: '#4ade80' },
  { label: 'Warning', value: '#fbbf24' },
  { label: 'Critical', value: '#f87171' },
  { label: 'Info', value: '#60a5fa' },
  { label: 'Neutral', value: 'rgba(255,255,255,0.85)' },
];

export type SeverityLevel = 'critical' | 'warning' | 'info' | 'neutral';

/**
 * Resolve entity state string to icon + color token.
 * Evaluates stateMap entries in order — first match wins.
 */
export function resolveStateColor(
  state: string,
  stateMap: StateMapEntry[],
): { icon: string; color: string; label?: string } | null {
  if (!stateMap || stateMap.length === 0) return null;
  const entry = stateMap.find((m) => m.state === state);
  return entry ? { icon: entry.icon, color: entry.color, label: entry.label } : null;
}

const CRITICAL_KEYWORDS = /\b(alarm|triggered|alert|emergency)\b/i;
const WARNING_KEYWORDS = /\b(warning|caution|attention)\b/i;

/**
 * Detect notification severity from title and message content.
 * Three levels per spec: critical > warning > neutral.
 */
export function detectSeverity(title: string, message: string): SeverityLevel {
  const combined = `${title} ${message}`;
  if (CRITICAL_KEYWORDS.test(combined)) return 'critical';
  if (WARNING_KEYWORDS.test(combined)) return 'warning';
  return 'neutral';
}

/**
 * Compute worst-case status dot for a set of state colors.
 * Checks against known dashboard token hex values.
 * Returns 'error' | 'warn' | 'ok' for DashStatusDot.
 */
export function worstStatus(colors: string[]): 'ok' | 'warn' | 'error' {
  if (colors.includes('#f87171')) return 'error';  // critical
  if (colors.includes('#fbbf24')) return 'warn';   // warning
  return 'ok';
}

/**
 * Evaluate a single state rule against a state value and attributes.
 * Returns true if the rule matches.
 */
export function evaluateStateRule(
  state: string,
  attributes: Record<string, unknown>,
  rule: StateRule,
): boolean {
  const rawValue = rule.evaluateAttribute
    ? String(attributes[rule.evaluateAttribute] ?? '')
    : state;

  switch (rule.operator) {
    case '=':
      return rawValue === rule.value;
    case '!=':
      return rawValue !== rule.value;
    case 'contains':
      return rawValue.includes(rule.value);
    case '>':
    case '<':
    case '>=':
    case '<=':
    case 'between': {
      const num = parseFloat(rawValue);
      const target = parseFloat(rule.value);
      if (isNaN(num) || isNaN(target)) return false;
      if (rule.operator === '>') return num > target;
      if (rule.operator === '<') return num < target;
      if (rule.operator === '>=') return num >= target;
      if (rule.operator === '<=') return num <= target;
      if (rule.operator === 'between') {
        const upper = parseFloat(rule.valueTo ?? '');
        if (isNaN(upper)) return false;
        return num >= target && num <= upper;
      }
      return false;
    }
    default:
      return false;
  }
}

/**
 * Evaluate state rules top-to-bottom, return first match.
 * Returns the matched rule's result (color, icon, label) or null.
 */
export function resolveStateRules(
  state: string,
  attributes: Record<string, unknown>,
  rules: StateRule[],
): { color: string; icon?: string; label?: string } | null {
  if (!rules || rules.length === 0) return null;
  for (const rule of rules) {
    if (evaluateStateRule(state, attributes, rule)) {
      return { color: rule.color, icon: rule.icon, label: rule.label };
    }
  }
  return null;
}
