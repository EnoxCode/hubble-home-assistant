import React, { useState } from 'react';
import type { PolygonShape } from '../../../shared/types';
import { EntityPicker } from '../../../shared/entity-picker';
import { StateRuleBuilder } from '../../../shared/state-rule-builder';
import { VisibilityBuilder } from '../../../shared/visibility-builder';
import { DASH_COLOR_PRESETS } from '../../../shared/state-utils';
import { Input, Toggle, Slider, ColorPicker, Select, Field } from 'hubble-ui';

interface PolygonConfigProps {
  polygon: PolygonShape;
  onChange: (polygon: PolygonShape) => void;
  moduleId: number;
}

export default function PolygonConfig({ polygon, onChange, moduleId }: PolygonConfigProps) {
  const [entityPickerOpen, setEntityPickerOpen] = useState(false);
  const [dynamicRulesOpen, setDynamicRulesOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);

  const update = (partial: Partial<PolygonShape>) => {
    onChange({ ...polygon, ...partial });
  };

  const hasDynamicEntity = !!polygon.dynamicEntity;

  return (
    <div className="element-config">
      <div className="element-config__header">Polygon</div>

      <Field label="Label">
        <Input
          type="text"
          value={polygon.label}
          onChange={(v) => update({ label: v })}
          placeholder="Polygon label"
        />
      </Field>

      {/* Points list */}
      <div className="element-config__section-title">Points</div>
      {polygon.points.map((point, idx) => (
        <div key={idx} className="element-config__row element-config__point-row">
          <span className="element-config__point-num">{idx + 1}</span>
          <span className="element-config__point-coord">X: {Math.round(point.x * 10) / 10}%</span>
          <span className="element-config__point-coord">Y: {Math.round(point.y * 10) / 10}%</span>
        </div>
      ))}
      <div className="element-config__hint">Click on canvas to add/move points</div>

      {/* Fill */}
      <div className="element-config__section-title">Fill</div>
      <Field label="Fill color">
        <ColorPicker
          value={polygon.fillColor}
          onChange={(v) => update({ fillColor: v })}
          presets={DASH_COLOR_PRESETS}
        />
      </Field>
      <Field label="Opacity">
        <Slider
          value={polygon.fillOpacity}
          onChange={(v) => update({ fillOpacity: v })}
          min={0}
          max={1}
          step={0.05}
        />
      </Field>
      <span className="element-config__slider-value">{Math.round(polygon.fillOpacity * 100)}%</span>

      {/* Border */}
      <div className="element-config__section-title">Border</div>
      <Field label="Style">
        <Select
          value={polygon.borderStyle}
          onChange={(v) => update({ borderStyle: v as 'none' | 'solid' | 'dashed' })}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Solid', value: 'solid' },
            { label: 'Dashed', value: 'dashed' },
          ]}
        />
      </Field>
      {polygon.borderStyle !== 'none' && (
        <>
          <Field label="Border color">
            <ColorPicker
              value={polygon.borderColor}
              onChange={(v) => update({ borderColor: v })}
              presets={DASH_COLOR_PRESETS}
            />
          </Field>
          <Field label="Border width">
            <Slider
              value={polygon.borderWidth}
              onChange={(v) => update({ borderWidth: v })}
              min={0.5}
              max={5}
              step={0.5}
            />
          </Field>
          <span className="element-config__slider-value">{polygon.borderWidth}px</span>
        </>
      )}

      {/* Dynamic color */}
      <div className="element-config__section-title">Dynamic Color</div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Bind to entity</span>
        <Toggle
          checked={hasDynamicEntity}
          onChange={(v) => update({ dynamicEntity: v ? '' : undefined })}
        />
      </div>
      {hasDynamicEntity && (
        <>
          <Field label="Entity">
            <button
              className="configure-panel__entity-chip"
              onClick={() => setEntityPickerOpen(true)}
            >
              {polygon.dynamicEntity ? (
                <span className="configure-panel__entity-name">{polygon.dynamicEntity}</span>
              ) : (
                <span className="configure-panel__entity-placeholder">Pick entity...</span>
              )}
            </button>
          </Field>

          {entityPickerOpen && (
            <EntityPicker
              moduleId={moduleId}
              selectedEntityId={polygon.dynamicEntity}
              onSelect={(id) => { update({ dynamicEntity: id }); setEntityPickerOpen(false); }}
              onClose={() => setEntityPickerOpen(false)}
            />
          )}

          <button
            className="element-config__collapsible-header"
            onClick={() => setDynamicRulesOpen(!dynamicRulesOpen)}
          >
            <span>State Rules</span>
            <span className="element-config__chevron">{dynamicRulesOpen ? '▾' : '▸'}</span>
          </button>
          {dynamicRulesOpen && (
            <div className="element-config__collapsible-body">
              <StateRuleBuilder
                rules={polygon.dynamicRules}
                onChange={(rules) => update({ dynamicRules: rules })}
                moduleId={moduleId}
                entityMode="implicit"
                showIcon={false}
                showLabel={false}
                showColor={true}
              />
            </div>
          )}
        </>
      )}

      {/* Display toggles */}
      <div className="element-config__section-title">Display</div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on minimap</span>
        <Toggle checked={polygon.showOnMinimap} onChange={(v) => update({ showOnMinimap: v })} />
      </div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on expanded</span>
        <Toggle checked={polygon.showOnExpanded} onChange={(v) => update({ showOnExpanded: v })} />
      </div>

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
            conditions={polygon.visibilityConditions}
            onChange={(conditions) => update({ visibilityConditions: conditions })}
            moduleId={moduleId}
          />
        </div>
      )}
    </div>
  );
}
