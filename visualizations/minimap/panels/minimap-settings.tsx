import React, { useState } from 'react';
import type { MinimapConfig, FloorConfig } from '../../../shared/types';
import { EntityPicker } from '../../../shared/entity-picker';
import { Input, Toggle, Slider, Select, Field } from 'hubble-ui';

interface MinimapSettingsProps {
  config: MinimapConfig;
  onConfigChange: (config: MinimapConfig) => void;
  moduleId: number;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function MinimapSettings({ config, onConfigChange, moduleId }: MinimapSettingsProps) {
  const [alarmPickerOpen, setAlarmPickerOpen] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const update = (partial: Partial<MinimapConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const updateLayers = (path: string, value: unknown) => {
    const layers = { ...config.layers };
    const parts = path.split('.');
    let target: Record<string, unknown> = layers as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      target[parts[i]] = { ...(target[parts[i]] as Record<string, unknown>) };
      target = target[parts[i]] as Record<string, unknown>;
    }
    target[parts[parts.length - 1]] = value;
    update({ layers: layers as MinimapConfig['layers'] });
  };

  const updateDisplay = (partial: Partial<MinimapConfig['display']>) => {
    update({ display: { ...config.display, ...partial } });
  };

  const updateFloor = (floorId: string, partial: Partial<FloorConfig>) => {
    const floors = config.floors.map((f) =>
      f.id === floorId ? { ...f, ...partial } : f,
    );
    update({ floors });
  };

  const handleSvgUpload = async (file: File, floorId?: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      const sessionToken = localStorage.getItem('hubble-session-token');
      if (sessionToken) headers['x-session-token'] = sessionToken;
      const res = await fetch(`/api/modules/${moduleId}/assets/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        alert(err.error || 'SVG upload failed');
        return;
      }
      const { assetPath } = await res.json();
      const svgUrl = `/api/modules/${moduleId}/assets/${assetPath}?v=${Date.now()}`;

      if (floorId) {
        // Replacing SVG for existing floor
        updateFloor(floorId, { svgUrl });
      } else {
        // Creating new floor with this SVG
        const name = file.name.replace(/\.svg$/i, '').replace(/[-_]/g, ' ');
        const newFloor: FloorConfig = {
          id: generateId(),
          name: name || `Floor ${config.floors.length + 1}`,
          svgUrl,
          entities: [],
          textLabels: [],
          roomZones: [],
          polygons: [],
        };
        update({ floors: [...config.floors, newFloor] });
      }
    } catch {
      alert('SVG upload failed — check the file and try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addFloor = () => {
    fileInputRef.current?.click();
  };

  const removeFloor = (floorId: string) => {
    if (config.floors.length <= 1) return;
    const floors = config.floors.filter((f) => f.id !== floorId);
    const activeFloor = Math.min(config.activeFloor, floors.length - 1);
    update({ floors, activeFloor });
  };

  return (
    <div className="element-config">
      <div className="element-config__header">Minimap Settings</div>

      {/* Widget size */}
      <div className="element-config__section-title">Widget Size</div>
      <div className="element-config__segment">
        <button
          className={`element-config__segment-btn${config.size === 'md' ? ' element-config__segment-btn--active' : ''}`}
          onClick={() => update({ size: 'md' })}
        >
          md
        </button>
        <button
          className={`element-config__segment-btn${config.size === 'lg' ? ' element-config__segment-btn--active' : ''}`}
          onClick={() => update({ size: 'lg' })}
        >
          lg
        </button>
      </div>

      {/* Floors */}
      <div className="element-config__section-title">Floors</div>
      {config.floors.map((floor, idx) => (
        <div key={floor.id} className="element-config__floor-card">
          {editingFloorId === floor.id ? (
            <div className="element-config__floor-edit">
              <Input
                type="text"
                value={floor.name}
                onChange={(v) => updateFloor(floor.id, { name: v })}
                placeholder="Floor name"
              />
              <div className="element-config__floor-svg-row">
                <span className="element-config__floor-svg-name">
                  {floor.svgUrl ? floor.svgUrl.split('/').pop() : 'No SVG'}
                </span>
                <button
                  className="element-config__floor-upload-btn"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.svg';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleSvgUpload(file, floor.id);
                    };
                    input.click();
                  }}
                >
                  {floor.svgUrl ? 'Replace SVG' : 'Upload SVG'}
                </button>
              </div>
              <button
                className="element-config__floor-done-btn"
                onClick={() => setEditingFloorId(null)}
              >
                Done
              </button>
            </div>
          ) : (
            <div className="element-config__floor-row">
              <span className="element-config__floor-idx">{idx + 1}</span>
              <span className="element-config__floor-name">{floor.name}</span>
              <button
                className="element-config__floor-edit-btn"
                onClick={() => setEditingFloorId(floor.id)}
              >
                Edit
              </button>
              {config.floors.length > 1 && (
                <button
                  className="element-config__remove-btn"
                  onClick={() => removeFloor(floor.id)}
                >
                  x
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSvgUpload(file);
        }}
      />
      <button className="element-config__add-btn" onClick={addFloor} disabled={uploading}>
        {uploading ? 'Uploading...' : '+ Add floor (upload SVG)'}
      </button>

      {/* Visual Layers */}
      <div className="element-config__section-title">Visual Layers</div>

      {/* Presence Rings */}
      <div className="element-config__layer-card">
        <div className="element-config__layer-header">
          <span>Presence Rings</span>
          <Toggle
            checked={config.layers.presenceRings.enabled}
            onChange={(v) => updateLayers('presenceRings.enabled', v)}
          />
        </div>
        {config.layers.presenceRings.enabled && (
          <div className="element-config__layer-body">
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on minimap</span>
              <Toggle
                checked={config.layers.presenceRings.showOnMinimap}
                onChange={(v) => updateLayers('presenceRings.showOnMinimap', v)}
              />
            </div>
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on expanded</span>
              <Toggle
                checked={config.layers.presenceRings.showOnExpanded}
                onChange={(v) => updateLayers('presenceRings.showOnExpanded', v)}
              />
            </div>
            <Field label="Ring style">
              <Select
                value={config.layers.presenceRings.ringStyle}
                onChange={(v) => updateLayers('presenceRings.ringStyle', v)}
                options={[
                  { label: 'Solid', value: 'solid' },
                  { label: 'Dashed', value: 'dashed' },
                ]}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Light Ambiance */}
      <div className="element-config__layer-card">
        <div className="element-config__layer-header">
          <span>Light Ambiance</span>
          <Toggle
            checked={config.layers.lightAmbiance.enabled}
            onChange={(v) => updateLayers('lightAmbiance.enabled', v)}
          />
        </div>
        {config.layers.lightAmbiance.enabled && (
          <div className="element-config__layer-body">
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on minimap</span>
              <Toggle
                checked={config.layers.lightAmbiance.showOnMinimap}
                onChange={(v) => updateLayers('lightAmbiance.showOnMinimap', v)}
              />
            </div>
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on expanded</span>
              <Toggle
                checked={config.layers.lightAmbiance.showOnExpanded}
                onChange={(v) => updateLayers('lightAmbiance.showOnExpanded', v)}
              />
            </div>
            <Field label="Glow intensity">
              <Slider
                value={config.layers.lightAmbiance.glowIntensity}
                onChange={(v) => updateLayers('lightAmbiance.glowIntensity', v)}
                min={0}
                max={100}
                step={5}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Security Zones */}
      <div className="element-config__layer-card">
        <div className="element-config__layer-header">
          <span>Security Zones</span>
          <Toggle
            checked={config.layers.securityZones.enabled}
            onChange={(v) => updateLayers('securityZones.enabled', v)}
          />
        </div>
        {config.layers.securityZones.enabled && (
          <div className="element-config__layer-body">
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on minimap</span>
              <Toggle
                checked={config.layers.securityZones.showOnMinimap}
                onChange={(v) => updateLayers('securityZones.showOnMinimap', v)}
              />
            </div>
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on expanded</span>
              <Toggle
                checked={config.layers.securityZones.showOnExpanded}
                onChange={(v) => updateLayers('securityZones.showOnExpanded', v)}
              />
            </div>
            <Field label="Alarm entity">
              <button
                className="configure-panel__entity-chip"
                onClick={() => setAlarmPickerOpen(true)}
              >
                {config.layers.securityZones.alarmEntityId ? (
                  <span className="configure-panel__entity-name">
                    {config.layers.securityZones.alarmEntityId}
                  </span>
                ) : (
                  <span className="configure-panel__entity-placeholder">Pick entity...</span>
                )}
              </button>
            </Field>
          </div>
        )}
      </div>

      {/* Activity Trail */}
      <div className="element-config__layer-card">
        <div className="element-config__layer-header">
          <span>Activity Trail</span>
          <Toggle
            checked={config.layers.activityTrail.enabled}
            onChange={(v) => updateLayers('activityTrail.enabled', v)}
          />
        </div>
        {config.layers.activityTrail.enabled && (
          <div className="element-config__layer-body">
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on minimap</span>
              <Toggle
                checked={config.layers.activityTrail.showOnMinimap}
                onChange={(v) => updateLayers('activityTrail.showOnMinimap', v)}
              />
            </div>
            <div className="element-config__toggle-row">
              <span className="element-config__toggle-label">Show on expanded</span>
              <Toggle
                checked={config.layers.activityTrail.showOnExpanded}
                onChange={(v) => updateLayers('activityTrail.showOnExpanded', v)}
              />
            </div>
            <Field label="Duration">
              <Select
                value={String(config.layers.activityTrail.durationMinutes)}
                onChange={(v) => updateLayers('activityTrail.durationMinutes', parseInt(v, 10))}
                options={[
                  { label: '5 minutes', value: '5' },
                  { label: '10 minutes', value: '10' },
                  { label: '15 minutes', value: '15' },
                  { label: '30 minutes', value: '30' },
                ]}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Display Options */}
      <div className="element-config__section-title">Display Options</div>
      <Field label="Floor plan opacity">
        <Slider
          value={config.display.floorPlanOpacity}
          onChange={(v) => updateDisplay({ floorPlanOpacity: v })}
          min={0}
          max={100}
          step={5}
        />
      </Field>
      <span className="element-config__slider-value">{config.display.floorPlanOpacity}%</span>

      <Field label="Inactive icon opacity">
        <Slider
          value={config.display.inactiveIconOpacity}
          onChange={(v) => updateDisplay({ inactiveIconOpacity: v })}
          min={0}
          max={100}
          step={5}
        />
      </Field>
      <span className="element-config__slider-value">{config.display.inactiveIconOpacity}%</span>

      <Field label="Max widget height (px, 0 = no limit)">
        <Slider
          value={config.display.maxHeight ?? 0}
          onChange={(v) => updateDisplay({ maxHeight: v || undefined })}
          min={0}
          max={1600}
          step={25}
        />
      </Field>
      <span className="element-config__slider-value">{config.display.maxHeight ? `${config.display.maxHeight}px` : 'No limit'}</span>

      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Auto-switch floor on activity</span>
        <Toggle
          checked={config.display.autoSwitchFloorOnActivity}
          onChange={(v) => updateDisplay({ autoSwitchFloorOnActivity: v })}
        />
      </div>
      <div className="element-config__toggle-row">
        <span className="element-config__toggle-label">Enable animations</span>
        <Toggle
          checked={config.display.enableAnimations}
          onChange={(v) => updateDisplay({ enableAnimations: v })}
        />
      </div>

      {/* Alarm entity picker */}
      {alarmPickerOpen && (
        <EntityPicker
          moduleId={0}
          selectedEntityId={config.layers.securityZones.alarmEntityId}
          onSelect={(id) => {
            updateLayers('securityZones.alarmEntityId', id);
            setAlarmPickerOpen(false);
          }}
          onClose={() => setAlarmPickerOpen(false)}
        />
      )}
    </div>
  );
}
