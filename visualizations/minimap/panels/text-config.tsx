import React, { useState } from 'react';
import type { TextLabel, EntityBinding } from '../../../shared/types';
import { EntityPicker } from '../../../shared/entity-picker';
import { StateRuleBuilder } from '../../../shared/state-rule-builder';
import { VisibilityBuilder } from '../../../shared/visibility-builder';
import { DASH_COLOR_PRESETS } from '../../../shared/state-utils';
import { Input, Toggle, ColorPicker, Field } from 'hubble-ui';

interface TextConfigProps {
  label: TextLabel;
  onChange: (label: TextLabel) => void;
  moduleId: number;
}

export default function TextConfig({ label, onChange, moduleId }: TextConfigProps) {
  const [bindingPickerIdx, setBindingPickerIdx] = useState<number | null>(null);
  const [colorRulesOpen, setColorRulesOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);

  const update = (partial: Partial<TextLabel>) => {
    onChange({ ...label, ...partial });
  };

  const updateBinding = (idx: number, updated: EntityBinding) => {
    const bindings = [...(label.bindings || [])];
    bindings[idx] = updated;
    update({ bindings });
  };

  const addBinding = () => {
    const bindings = [...(label.bindings || [])];
    const varName = `var${bindings.length + 1}`;
    bindings.push({ variable: varName, entityId: '' });
    update({ bindings });
  };

  const removeBinding = (idx: number) => {
    const bindings = (label.bindings || []).filter((_, i) => i !== idx);
    update({ bindings });
  };

  // Preview: replace {{variable}} with mock data
  const previewText = (): string => {
    if (label.mode === 'static') return label.staticText || '';
    let text = label.formatTemplate || '';
    for (const b of label.bindings || []) {
      const mockVal = b.entityId ? `[${b.entityId.split('.').pop()}]` : '?';
      text = text.replace(new RegExp(`\\{\\{${b.variable}\\}\\}`, 'g'), mockVal);
    }
    return text;
  };

  return (
    <div className="element-config">
      <div className="element-config__header">Text Label</div>

      {/* Mode toggle */}
      <div className="element-config__segment">
        <button
          className={`element-config__segment-btn${label.mode === 'entity_value' ? ' element-config__segment-btn--active' : ''}`}
          onClick={() => update({ mode: 'entity_value' })}
        >
          Entity value
        </button>
        <button
          className={`element-config__segment-btn${label.mode === 'static' ? ' element-config__segment-btn--active' : ''}`}
          onClick={() => update({ mode: 'static' })}
        >
          Static text
        </button>
      </div>

      {/* Entity value mode */}
      {label.mode === 'entity_value' && (
        <>
          <div className="element-config__section-title">Entity Bindings</div>
          {(label.bindings || []).map((binding, idx) => (
            <div key={idx} className="element-config__binding-row">
              <Input
                type="text"
                value={binding.variable}
                onChange={(v) => updateBinding(idx, { ...binding, variable: v })}
                placeholder="Variable name"
              />
              <button
                className="configure-panel__entity-chip"
                onClick={() => setBindingPickerIdx(idx)}
              >
                {binding.entityId ? (
                  <span className="configure-panel__entity-name">{binding.entityId}</span>
                ) : (
                  <span className="configure-panel__entity-placeholder">Pick entity...</span>
                )}
              </button>
              <button
                className="element-config__remove-btn"
                onClick={() => removeBinding(idx)}
              >
                x
              </button>
            </div>
          ))}
          <button className="element-config__add-btn" onClick={addBinding}>
            + Add binding
          </button>

          {bindingPickerIdx !== null && (
            <EntityPicker
              moduleId={moduleId}
              selectedEntityId={(label.bindings || [])[bindingPickerIdx]?.entityId}
              onSelect={(id) => {
                updateBinding(bindingPickerIdx, {
                  ...(label.bindings || [])[bindingPickerIdx],
                  entityId: id,
                });
                setBindingPickerIdx(null);
              }}
              onClose={() => setBindingPickerIdx(null)}
            />
          )}

          <Field label="Format template">
            <textarea
              className="element-config__textarea"
              value={label.formatTemplate || ''}
              onChange={(e) => update({ formatTemplate: e.target.value })}
              placeholder="{{var1|round:1}}°C&#10;**bold** *italic*"
              rows={3}
            />
          </Field>

          {(label.bindings || []).length > 0 && (
            <div className="element-config__hint">
              Available: {(label.bindings || []).map((b) => `{{${b.variable}}}`).join(', ')}
              <br />
              Pipes: |round, |round:1, |ceil, |floor, |fixed:2
              <br />
              Format: **bold**, *italic*, newlines
              <br />
              Icons: &lt;mdi:thermometer&gt; &lt;mdi:water-percent&gt;
            </div>
          )}

          {/* Preview */}
          <div className="element-config__preview">
            <span className="element-config__preview-label">Preview</span>
            <span className="element-config__preview-text" style={{ color: label.color }}>
              {previewText() || '(empty)'}
            </span>
          </div>
        </>
      )}

      {/* Static mode */}
      {label.mode === 'static' && (
        <Field label="Static text">
          <Input
            type="text"
            value={label.staticText || ''}
            onChange={(v) => update({ staticText: v })}
            placeholder="Enter label text"
          />
        </Field>
      )}

      {/* Position */}
      <div className="element-config__row">
        <Field label="X (%)">
          <Input
            type="number"
            value={String(Math.round(label.x * 10) / 10)}
            onChange={(v) => update({ x: parseFloat(v) || 0 })}
          />
        </Field>
        <Field label="Y (%)">
          <Input
            type="number"
            value={String(Math.round(label.y * 10) / 10)}
            onChange={(v) => update({ y: parseFloat(v) || 0 })}
          />
        </Field>
      </div>

      {/* Font size */}
      <div className="element-config__section-title">Font Size</div>
      <div className="element-config__segment">
        <button
          className={`element-config__segment-btn${label.fontSize === 'sm' ? ' element-config__segment-btn--active' : ''}`}
          onClick={() => update({ fontSize: 'sm' })}
        >
          sm
        </button>
        <button
          className={`element-config__segment-btn${label.fontSize === 'md' ? ' element-config__segment-btn--active' : ''}`}
          onClick={() => update({ fontSize: 'md' })}
        >
          md
        </button>
        <button
          className={`element-config__segment-btn${label.fontSize === 'lg' ? ' element-config__segment-btn--active' : ''}`}
          onClick={() => update({ fontSize: 'lg' })}
        >
          lg
        </button>
      </div>

      {/* Color */}
      <Field label="Color">
        <ColorPicker
          value={label.color}
          onChange={(v) => update({ color: v })}
          presets={DASH_COLOR_PRESETS}
        />
      </Field>

      {/* Display toggles */}
      <div className="element-config__section-title">Display</div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on minimap</span>
        <Toggle checked={label.showOnMinimap} onChange={(v) => update({ showOnMinimap: v })} />
      </div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on expanded</span>
        <Toggle checked={label.showOnExpanded} onChange={(v) => update({ showOnExpanded: v })} />
      </div>

      {/* Color Rules - collapsible */}
      <button
        className="element-config__collapsible-header"
        onClick={() => setColorRulesOpen(!colorRulesOpen)}
      >
        <span>Color Rules</span>
        <span className="element-config__chevron">{colorRulesOpen ? '▾' : '▸'}</span>
      </button>
      {colorRulesOpen && (
        <div className="element-config__collapsible-body">
          <StateRuleBuilder
            rules={label.colorRules}
            onChange={(rules) => update({ colorRules: rules })}
            moduleId={moduleId}
            entityMode="bindings"
            bindings={label.bindings}
            showIcon={false}
            showLabel={true}
            showColor={true}
          />
        </div>
      )}

      {/* Visibility - collapsible */}
      <button
        className="element-config__collapsible-header"
        onClick={() => setVisibilityOpen(!visibilityOpen)}
      >
        <span>Visibility Conditions</span>
        <span className="element-config__chevron">{visibilityOpen ? '▾' : '▸'}</span>
      </button>
      {visibilityOpen && (
        <div className="element-config__collapsible-body">
          <VisibilityBuilder
            conditions={label.visibilityConditions}
            onChange={(conditions) => update({ visibilityConditions: conditions })}
            moduleId={moduleId}
          />
        </div>
      )}
    </div>
  );
}
