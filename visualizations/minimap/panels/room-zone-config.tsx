import React, { useState } from 'react';
import type { RoomZone } from '../../../shared/types';
import { EntityPicker } from '../../../shared/entity-picker';
import { Input, Toggle, Field } from 'hubble-ui';

interface RoomZoneConfigProps {
  zone: RoomZone;
  onChange: (zone: RoomZone) => void;
  moduleId: number;
}

type PickerTarget = 'temp' | 'humidity' | 'security' | { list: 'presence' | 'light'; index?: number };

export default function RoomZoneConfig({ zone, onChange, moduleId }: RoomZoneConfigProps) {
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const update = (partial: Partial<RoomZone>) => {
    onChange({ ...zone, ...partial });
  };

  const handlePickerSelect = (entityId: string) => {
    if (!pickerTarget) return;

    if (pickerTarget === 'temp') {
      update({ tempEntityId: entityId });
    } else if (pickerTarget === 'humidity') {
      update({ humidityEntityId: entityId });
    } else if (pickerTarget === 'security') {
      update({ securityEntityId: entityId });
    } else if (typeof pickerTarget === 'object') {
      if (pickerTarget.list === 'presence') {
        const list = [...zone.presenceEntities];
        if (pickerTarget.index !== undefined) {
          list[pickerTarget.index] = entityId;
        } else {
          list.push(entityId);
        }
        update({ presenceEntities: list });
      } else if (pickerTarget.list === 'light') {
        const list = [...zone.lightEntities];
        if (pickerTarget.index !== undefined) {
          list[pickerTarget.index] = entityId;
        } else {
          list.push(entityId);
        }
        update({ lightEntities: list });
      }
    }
    setPickerTarget(null);
  };

  return (
    <div className="element-config">
      <div className="element-config__header">Room Zone</div>

      <Field label="Zone Name">
        <Input
          type="text"
          value={zone.name}
          onChange={(v) => update({ name: v })}
          placeholder="e.g. Living Room"
        />
      </Field>

      {/* Bounds */}
      <div className="element-config__section-title">Bounds</div>
      <div className="element-config__row">
        <Field label="X (%)">
          <Input
            type="number"
            value={String(Math.round(zone.x * 10) / 10)}
            onChange={(v) => update({ x: parseFloat(v) || 0 })}
          />
        </Field>
        <Field label="Y (%)">
          <Input
            type="number"
            value={String(Math.round(zone.y * 10) / 10)}
            onChange={(v) => update({ y: parseFloat(v) || 0 })}
          />
        </Field>
      </div>
      <div className="element-config__row">
        <Field label="Width (%)">
          <Input
            type="number"
            value={String(Math.round(zone.width * 10) / 10)}
            onChange={(v) => update({ width: parseFloat(v) || 0 })}
          />
        </Field>
        <Field label="Height (%)">
          <Input
            type="number"
            value={String(Math.round(zone.height * 10) / 10)}
            onChange={(v) => update({ height: parseFloat(v) || 0 })}
          />
        </Field>
      </div>
      <div className="element-config__hint">Drag handles on canvas to resize</div>

      {/* Climate sensors */}
      <div className="element-config__section-title">Climate Sensors</div>
      <Field label="Temperature entity">
        <button className="configure-panel__entity-chip" onClick={() => setPickerTarget('temp')}>
          {zone.tempEntityId ? (
            <span className="configure-panel__entity-name">{zone.tempEntityId}</span>
          ) : (
            <span className="configure-panel__entity-placeholder">Pick entity...</span>
          )}
        </button>
      </Field>
      <Field label="Humidity entity">
        <button className="configure-panel__entity-chip" onClick={() => setPickerTarget('humidity')}>
          {zone.humidityEntityId ? (
            <span className="configure-panel__entity-name">{zone.humidityEntityId}</span>
          ) : (
            <span className="configure-panel__entity-placeholder">Pick entity...</span>
          )}
        </button>
      </Field>

      {/* Presence entities */}
      <div className="element-config__section-title">Presence Entities</div>
      {zone.presenceEntities.map((eid, idx) => (
        <div key={idx} className="element-config__chip-row">
          <span className="element-config__chip">{eid}</span>
          <button
            className="element-config__remove-btn"
            onClick={() => update({ presenceEntities: zone.presenceEntities.filter((_, i) => i !== idx) })}
          >
            x
          </button>
        </div>
      ))}
      <button
        className="element-config__add-btn"
        onClick={() => setPickerTarget({ list: 'presence' })}
      >
        + Add presence entity
      </button>

      {/* Security zone */}
      <div className="element-config__section-title">Security Zone</div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Override global alarm</span>
        <Toggle
          checked={zone.securityOverride}
          onChange={(v) => update({ securityOverride: v })}
        />
      </div>
      <div className={zone.securityOverride ? '' : 'element-config__dimmed'}>
        <Field label="Security entity">
          <button
            className="configure-panel__entity-chip"
            onClick={() => zone.securityOverride && setPickerTarget('security')}
            disabled={!zone.securityOverride}
          >
            {zone.securityEntityId ? (
              <span className="configure-panel__entity-name">{zone.securityEntityId}</span>
            ) : (
              <span className="configure-panel__entity-placeholder">Pick entity...</span>
            )}
          </button>
        </Field>
      </div>

      {/* Light ambiance */}
      <div className="element-config__section-title">Light Ambiance</div>
      {zone.lightEntities.map((eid, idx) => (
        <div key={idx} className="element-config__chip-row">
          <span className="element-config__chip">{eid}</span>
          <button
            className="element-config__remove-btn"
            onClick={() => update({ lightEntities: zone.lightEntities.filter((_, i) => i !== idx) })}
          >
            x
          </button>
        </div>
      ))}
      <button
        className="element-config__add-btn"
        onClick={() => setPickerTarget({ list: 'light' })}
      >
        + Add light entity
      </button>

      {/* Display toggles */}
      <div className="element-config__section-title">Display</div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show zone border</span>
        <Toggle checked={zone.showZoneBorder} onChange={(v) => update({ showZoneBorder: v })} />
      </div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on minimap</span>
        <Toggle checked={zone.showOnMinimap} onChange={(v) => update({ showOnMinimap: v })} />
      </div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Show on expanded</span>
        <Toggle checked={zone.showOnExpanded} onChange={(v) => update({ showOnExpanded: v })} />
      </div>

      {/* Entity picker portal */}
      {pickerTarget !== null && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={
            pickerTarget === 'temp' ? zone.tempEntityId :
            pickerTarget === 'humidity' ? zone.humidityEntityId :
            pickerTarget === 'security' ? zone.securityEntityId :
            undefined
          }
          onSelect={handlePickerSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
