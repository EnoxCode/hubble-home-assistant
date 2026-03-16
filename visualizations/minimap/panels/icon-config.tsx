import React, { useState } from 'react';
import type { EntityPin } from '../../../shared/types';
import { EntityPicker } from '../../../shared/entity-picker';
import { IconPicker } from '../../../shared/icon-picker';
import { StateRuleBuilder } from '../../../shared/state-rule-builder';
import { VisibilityBuilder } from '../../../shared/visibility-builder';
import { Input, Toggle, Slider, Field } from 'hubble-ui';

interface IconConfigProps {
  pin: EntityPin;
  onChange: (pin: EntityPin) => void;
  moduleId: number;
}

export default function IconConfig({ pin, onChange, moduleId }: IconConfigProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stateRulesOpen, setStateRulesOpen] = useState(true);
  const [visibilityOpen, setVisibilityOpen] = useState(false);

  const update = (partial: Partial<EntityPin>) => {
    onChange({ ...pin, ...partial });
  };

  return (
    <div className="element-config">
      <div className="element-config__header">Icon Pin</div>

      <Field label="Entity">
        <button className="configure-panel__entity-chip" onClick={() => setPickerOpen(true)}>
          {pin.entityId ? (
            <>
              <span className="configure-panel__entity-domain">{pin.entityId.split('.')[0]}</span>
              <span className="configure-panel__entity-name">{pin.entityId}</span>
            </>
          ) : (
            <span className="configure-panel__entity-placeholder">Pick an entity...</span>
          )}
        </button>
      </Field>

      {pickerOpen && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={pin.entityId}
          onSelect={(id) => { update({ entityId: id }); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <Field label="Icon">
        <IconPicker
          selectedIcon={pin.icon}
          onSelect={(icon) => update({ icon })}
        />
      </Field>

      <div className="element-config__row">
        <Field label="X (%)">
          <Input
            type="number"
            value={String(Math.round(pin.x * 10) / 10)}
            onChange={(v) => update({ x: parseFloat(v) || 0 })}
          />
        </Field>
        <Field label="Y (%)">
          <Input
            type="number"
            value={String(Math.round(pin.y * 10) / 10)}
            onChange={(v) => update({ y: parseFloat(v) || 0 })}
          />
        </Field>
      </div>

      <Field label="Label">
        <Input
          type="text"
          value={pin.label || ''}
          onChange={(v) => update({ label: v || undefined })}
          placeholder="Optional label text"
        />
      </Field>

      {/* Display toggles */}
      <div className="element-config__section-title">Display</div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on minimap</span>
        <Toggle checked={pin.showOnMinimap} onChange={(v) => update({ showOnMinimap: v })} />
      </div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on expanded</span>
        <Toggle checked={pin.showOnExpanded} onChange={(v) => update({ showOnExpanded: v })} />
      </div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show label</span>
        <Toggle checked={pin.showLabel} onChange={(v) => update({ showLabel: v })} />
      </div>

      {/* State Rules - collapsible */}
      <button
        className="element-config__collapsible-header"
        onClick={() => setStateRulesOpen(!stateRulesOpen)}
      >
        <span>State Rules</span>
        <span className="element-config__chevron">{stateRulesOpen ? '▾' : '▸'}</span>
      </button>
      {stateRulesOpen && (
        <div className="element-config__collapsible-body">
          <StateRuleBuilder
            rules={pin.stateRules}
            onChange={(rules) => update({ stateRules: rules })}
            moduleId={moduleId}
            entityMode="implicit"
            showIcon={true}
            showLabel={true}
            showColor={true}
          />
        </div>
      )}

      {/* Expanded scale - collapsible */}
      <div className="element-config__section-title">Expanded Scale</div>
      <Slider
        value={pin.expandedScale ?? 1}
        onChange={(v) => update({ expandedScale: v })}
        min={1}
        max={3}
        step={0.5}
      />
      <span className="element-config__slider-value">{pin.expandedScale ?? 1}x</span>

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
            conditions={pin.visibilityConditions}
            onChange={(conditions) => update({ visibilityConditions: conditions })}
            moduleId={moduleId}
          />
        </div>
      )}
    </div>
  );
}
