import React from 'react';
import type { StateRule, EntityBinding } from './types';
import { DASH_COLOR_PRESETS } from './state-utils';
import { IconPicker } from './icon-picker';
import { ColorPicker } from 'hubble-ui';
import './state-rule-builder.css';

const OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '\u2260' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '\u2265' },
  { value: '<=', label: '\u2264' },
  { value: 'between', label: 'between' },
  { value: 'contains', label: 'contains' },
] as const;

type OperatorValue = StateRule['operator'];

interface StateRuleBuilderProps {
  rules: StateRule[];
  onChange: (rules: StateRule[]) => void;
  moduleId: number;
  entityMode: 'implicit' | 'bindings' | 'select';
  entities?: string[];
  bindings?: EntityBinding[];
  showIcon: boolean;
  showLabel: boolean;
  showColor: boolean;
}

function createEmptyRule(): StateRule {
  return { operator: '=', value: '', color: '#4ade80' };
}

export function StateRuleBuilder({
  rules,
  onChange,
  entityMode,
  entities,
  bindings,
  showIcon,
  showLabel,
  showColor,
}: StateRuleBuilderProps) {
  function updateRule(index: number, updates: Partial<StateRule>) {
    const next = [...rules];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  }

  function addRule() {
    onChange([...rules, createEmptyRule()]);
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }

  return (
    <div className="srb">
      {rules.map((rule, index) => (
        <RuleCard
          key={index}
          rule={rule}
          index={index}
          entityMode={entityMode}
          entities={entities}
          bindings={bindings}
          showIcon={showIcon}
          showLabel={showLabel}
          showColor={showColor}
          onUpdate={(updates) => updateRule(index, updates)}
          onRemove={() => removeRule(index)}
        />
      ))}
      <button className="srb-add-btn" onClick={addRule}>+ Add rule</button>
    </div>
  );
}

interface RuleCardProps {
  rule: StateRule;
  index: number;
  entityMode: 'implicit' | 'bindings' | 'select';
  entities?: string[];
  bindings?: EntityBinding[];
  showIcon: boolean;
  showLabel: boolean;
  showColor: boolean;
  onUpdate: (updates: Partial<StateRule>) => void;
  onRemove: () => void;
}

function RuleCard({
  rule,
  index,
  entityMode,
  entities,
  bindings,
  showIcon,
  showLabel,
  showColor,
  onUpdate,
  onRemove,
}: RuleCardProps) {
  const isAttribute = !!rule.evaluateAttribute || rule.evaluateAttribute === '';
  const isBetween = rule.operator === 'between';

  return (
    <div className="srb-card">
      <div className="srb-card-header">
        <span className="srb-card-label">Rule {index + 1}</span>
        <button
          className="srb-remove-btn"
          aria-label="Remove rule"
          onClick={onRemove}
        >
          x
        </button>
      </div>

      {/* Binding variable selector (bindings mode) */}
      {entityMode === 'bindings' && bindings && bindings.length > 0 && (
        <div className="srb-binding-row">
          <span className="srb-binding-label">Binding</span>
          <select
            className="srb-binding-select"
            value={rule.bindingVariable ?? ''}
            onChange={(e) => onUpdate({ bindingVariable: e.target.value })}
          >
            <option value="">Select...</option>
            {bindings.map((b) => (
              <option key={b.variable} value={b.variable}>{b.variable}</option>
            ))}
          </select>
        </div>
      )}

      {/* Entity selector (select mode) */}
      {entityMode === 'select' && entities && entities.length > 0 && (
        <div className="srb-binding-row">
          <span className="srb-binding-label">Entity</span>
          <select
            className="srb-entity-select"
            value={rule.entityId ?? ''}
            onChange={(e) => onUpdate({ entityId: e.target.value })}
          >
            <option value="">Select...</option>
            {entities.map((eid) => (
              <option key={eid} value={eid}>{eid}</option>
            ))}
          </select>
        </div>
      )}

      {/* State vs Attribute toggle */}
      <div className="srb-attr-row">
        <div className="srb-attr-toggle">
          <button
            className={`srb-attr-toggle-btn${!isAttribute ? ' srb-attr-toggle-btn--active' : ''}`}
            onClick={() => onUpdate({ evaluateAttribute: undefined })}
          >
            State
          </button>
          <button
            className={`srb-attr-toggle-btn${isAttribute ? ' srb-attr-toggle-btn--active' : ''}`}
            onClick={() => onUpdate({ evaluateAttribute: rule.evaluateAttribute ?? '' })}
          >
            Attr
          </button>
        </div>
        {isAttribute && (
          <input
            className="srb-attr-input"
            placeholder="Attribute name"
            value={rule.evaluateAttribute ?? ''}
            onChange={(e) => onUpdate({ evaluateAttribute: e.target.value })}
          />
        )}
      </div>

      {/* Operator grid */}
      <div className="srb-operator-grid">
        {OPERATORS.map((op) => (
          <button
            key={op.value}
            className={`srb-op-btn${rule.operator === op.value ? ' srb-op-btn--active' : ''}`}
            onClick={() => {
              const updates: Partial<StateRule> = { operator: op.value as OperatorValue };
              if (op.value !== 'between') {
                updates.valueTo = undefined;
              }
              onUpdate(updates);
            }}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Value inputs */}
      <div className="srb-value-row">
        <input
          className="srb-value-input"
          placeholder="Value"
          value={rule.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
        />
        {isBetween && (
          <>
            <span className="srb-between-label">to</span>
            <input
              className="srb-value-input"
              placeholder="Upper"
              value={rule.valueTo ?? ''}
              onChange={(e) => onUpdate({ valueTo: e.target.value })}
            />
          </>
        )}
      </div>

      {/* Output: result section */}
      <div className="srb-result-section">
        <span className="srb-result-title">Result</span>

        {showColor && (
          <div className="srb-result-row">
            <span className="srb-result-label">Color</span>
            <ColorPicker
              value={rule.color}
              onChange={(color) => onUpdate({ color })}
              presets={DASH_COLOR_PRESETS}
            />
          </div>
        )}

        {showIcon && (
          <div className="srb-result-row">
            <span className="srb-result-label">Icon</span>
            <IconPicker
              selectedIcon={rule.icon}
              onSelect={(icon) => onUpdate({ icon })}
            />
          </div>
        )}

        {showLabel && (
          <div className="srb-result-row">
            <span className="srb-result-label">Label</span>
            <input
              className="srb-label-input"
              placeholder="Override label text"
              value={rule.label ?? ''}
              onChange={(e) => onUpdate({ label: e.target.value || undefined })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
