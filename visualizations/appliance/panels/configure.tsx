import { useState, useEffect } from 'react';
import { EntityPicker } from '../../../shared/entity-picker';
import { IconPicker } from '../../../shared/icon-picker';
import { VisibilityBuilder } from '../../../shared/visibility-builder';
import { normalizeToTwoLevel } from '../../../shared/types';
import type { ApplianceConfig, MetricCell, SecondaryEntity, WarningRule, DomainGroup, ConditionGroup } from '../../../shared/types';
import { Input, Field, Select, Button } from 'hubble-ui';
import { APPLIANCE_PRESETS } from '../presets';
import './configure.css';

interface ConfigurePanelProps {
  config: ApplianceConfig;
  onConfigChange: (config: ApplianceConfig) => void;
  moduleId: number;
}

const MAX_METRIC_CELLS = 4;

export default function ConfigurePanel({ config, onConfigChange, moduleId }: ConfigurePanelProps) {
  const [entityMap, setEntityMap] = useState<Map<string, string>>(new Map());

  // Entity picker state: track which "slot" is open
  const [openPicker, setOpenPicker] = useState<
    | { kind: 'status' }
    | { kind: 'metric'; index: number }
    | { kind: 'progress' }
    | { kind: 'progressElapsed' }
    | { kind: 'progressRemaining' }
    | { kind: 'secondary'; index: number }
    | { kind: 'warning'; index: number }
    | null
  >(null);

  // Warning expansion state
  const [expandedWarning, setExpandedWarning] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/modules/${moduleId}/entities`)
      .then((r) => r.json())
      .then((data: { domains: DomainGroup[] }) => {
        const map = new Map<string, string>();
        for (const d of data.domains) {
          for (const e of d.entities) map.set(e.entity_id, e.friendly_name);
        }
        setEntityMap(map);
      })
      .catch(() => {});
  }, [moduleId]);

  function entityLabel(entityId: string): { domain: string | null; name: string | null } {
    if (!entityId) return { domain: null, name: null };
    const friendly = entityMap.get(entityId);
    const domain = entityId.split('.')[0];
    return { domain, name: friendly ?? entityId };
  }

  // ── Preset picker ──────────────────────────────────────────────────────────
  function handlePreset(presetId: string) {
    const preset = APPLIANCE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onConfigChange({ ...config, ...preset.defaults });
  }

  // ── Metric cells ──────────────────────────────────────────────────────────
  function updateMetricCell(index: number, patch: Partial<MetricCell>) {
    const cells = [...(config.metricCells || [])];
    cells[index] = { ...cells[index], ...patch };
    onConfigChange({ ...config, metricCells: cells });
  }

  function addMetricCell() {
    const cells = [...(config.metricCells || [])];
    if (cells.length >= MAX_METRIC_CELLS) return;
    cells.push({ label: '', entityId: '' });
    onConfigChange({ ...config, metricCells: cells });
  }

  function removeMetricCell(index: number) {
    const cells = (config.metricCells || []).filter((_, i) => i !== index);
    onConfigChange({ ...config, metricCells: cells });
  }

  // ── Secondary entities ────────────────────────────────────────────────────
  function updateSecondary(index: number, patch: Partial<SecondaryEntity>) {
    const list = [...(config.secondaryEntities || [])];
    list[index] = { ...list[index], ...patch };
    onConfigChange({ ...config, secondaryEntities: list });
  }

  function addSecondary() {
    const list = [...(config.secondaryEntities || []), { entityId: '' }];
    onConfigChange({ ...config, secondaryEntities: list });
  }

  function removeSecondary(index: number) {
    const list = (config.secondaryEntities || []).filter((_, i) => i !== index);
    onConfigChange({ ...config, secondaryEntities: list });
  }

  // ── Warnings ──────────────────────────────────────────────────────────────
  function updateWarning(index: number, patch: Partial<WarningRule>) {
    const list = [...(config.warnings || [])];
    list[index] = { ...list[index], ...patch };
    onConfigChange({ ...config, warnings: list });
  }

  function addWarning() {
    const newWarning: WarningRule = {
      entityId: '',
      label: '',
      severity: 'warning',
      visibilityConditions: { operator: 'AND', conditions: [] },
    };
    onConfigChange({ ...config, warnings: [...(config.warnings || []), newWarning] });
    setExpandedWarning((config.warnings || []).length);
  }

  function removeWarning(index: number) {
    const list = (config.warnings || []).filter((_, i) => i !== index);
    onConfigChange({ ...config, warnings: list });
    if (expandedWarning === index) setExpandedWarning(null);
  }

  const metricCells = config.metricCells || [];
  const secondaryEntities = config.secondaryEntities || [];
  const warnings = config.warnings || [];

  return (
    <div className="ha-appliance-configure">

      {/* Preset picker */}
      <Field label="Preset">
        <div className="preset-grid">
          {APPLIANCE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`preset-chip${config.icon === preset.defaults.icon && config.name === preset.defaults.name ? ' active' : ''}`}
              onClick={() => handlePreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="section-divider" />

      {/* Widget name */}
      <Field label="Widget Name">
        <Input
          type="text"
          value={config.name || ''}
          onChange={(v) => onConfigChange({ ...config, name: v || '' })}
          placeholder="e.g. Oven"
        />
      </Field>

      {/* Icon picker */}
      <Field label="Icon">
        <IconPicker
          selectedIcon={config.icon}
          onSelect={(icon) => onConfigChange({ ...config, icon })}
        />
      </Field>

      <div className="section-divider" />

      {/* Status entity */}
      <Field label="Status Entity" hint="Drives border color and header status text">
        <button className="entity-select-btn" onClick={() => setOpenPicker({ kind: 'status' })}>
          {config.statusEntity ? (
            <>
              {entityLabel(config.statusEntity).domain && (
                <span className="entity-domain">{entityLabel(config.statusEntity).domain}</span>
              )}
              <span className="entity-name">{entityLabel(config.statusEntity).name}</span>
            </>
          ) : (
            <span className="entity-placeholder">Pick an entity...</span>
          )}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="entity-chevron">
            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </Field>

      <div className="section-divider" />

      {/* Metric cells */}
      <Field label={`Metric Cells (max ${MAX_METRIC_CELLS})`}>
        <div className="cell-list">
          {metricCells.map((cell, i) => (
            <div key={i} className="cell-row">
              <div className="cell-label-input">
                <Input
                  type="text"
                  value={cell.label}
                  onChange={(v) => updateMetricCell(i, { label: v || '' })}
                  placeholder="Label"
                />
              </div>
              <button className="entity-select-btn" onClick={() => setOpenPicker({ kind: 'metric', index: i })}>
                {cell.entityId ? (
                  <>
                    {entityLabel(cell.entityId).domain && (
                      <span className="entity-domain">{entityLabel(cell.entityId).domain}</span>
                    )}
                    <span className="entity-name">{entityLabel(cell.entityId).name}</span>
                  </>
                ) : (
                  <span className="entity-placeholder">Pick an entity...</span>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="entity-chevron">
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                className={`format-btn${cell.formatState === 'titlecase' ? ' format-btn--active' : ''}`}
                onClick={() => updateMetricCell(i, { formatState: cell.formatState === 'titlecase' ? 'raw' : 'titlecase' })}
                title="Title Case formatting"
              >
                Aa
              </button>
              <button className="remove-btn" onClick={() => removeMetricCell(i)} title="Remove cell">
                ×
              </button>
            </div>
          ))}
        </div>
        {metricCells.length < MAX_METRIC_CELLS && (
          <button className="add-btn" onClick={addMetricCell}>
            + Add Metric Cell
          </button>
        )}
      </Field>

      <div className="section-divider" />

      {/* Progress source */}
      <Field label="Progress Bar">
        <Select
          value={
            config.progressSource === 'none' || !config.progressSource
              ? 'none'
              : config.progressSource === 'calculated'
                ? 'calculated'
                : 'entity'
          }
          onChange={(v) => {
            if (v === 'none') {
              onConfigChange({ ...config, progressSource: 'none', progressElapsedEntity: undefined, progressRemainingEntity: undefined });
            } else if (v === 'calculated') {
              onConfigChange({ ...config, progressSource: 'calculated' });
            } else {
              onConfigChange({ ...config, progressSource: config.progressSource === 'calculated' ? 'none' : config.progressSource });
            }
          }}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Entity (0–100%)', value: 'entity' },
            { label: 'Calculated (elapsed + remaining)', value: 'calculated' },
          ]}
        />

        {/* Entity mode: pick a 0-100 entity */}
        {config.progressSource && config.progressSource !== 'none' && config.progressSource !== 'calculated' && (
          <button
            className="entity-select-btn entity-select-btn--spaced"
            onClick={() => setOpenPicker({ kind: 'progress' })}
          >
            {entityLabel(config.progressSource).domain && (
              <span className="entity-domain">{entityLabel(config.progressSource).domain}</span>
            )}
            <span className="entity-name">{entityLabel(config.progressSource).name}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="entity-chevron">
              <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Calculated mode: pick elapsed + remaining entities */}
        {config.progressSource === 'calculated' && (
          <div className="progress-calc-fields">
            <Field label="Elapsed Time Entity" hint="Value in minutes">
              <button className="entity-select-btn" onClick={() => setOpenPicker({ kind: 'progressElapsed' })}>
                {config.progressElapsedEntity ? (
                  <>
                    {entityLabel(config.progressElapsedEntity).domain && (
                      <span className="entity-domain">{entityLabel(config.progressElapsedEntity).domain}</span>
                    )}
                    <span className="entity-name">{entityLabel(config.progressElapsedEntity).name}</span>
                  </>
                ) : (
                  <span className="entity-placeholder">Pick elapsed time entity...</span>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="entity-chevron">
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </Field>
            <Field label="Remaining Time Entity" hint="Value in minutes">
              <button className="entity-select-btn" onClick={() => setOpenPicker({ kind: 'progressRemaining' })}>
                {config.progressRemainingEntity ? (
                  <>
                    {entityLabel(config.progressRemainingEntity).domain && (
                      <span className="entity-domain">{entityLabel(config.progressRemainingEntity).domain}</span>
                    )}
                    <span className="entity-name">{entityLabel(config.progressRemainingEntity).name}</span>
                  </>
                ) : (
                  <span className="entity-placeholder">Pick remaining time entity...</span>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="entity-chevron">
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </Field>
          </div>
        )}
      </Field>

      <div className="section-divider" />

      {/* Secondary entities */}
      <Field label="Secondary Entities" hint="Shown as meta text below the metric strip">
        <div className="cell-list">
          {secondaryEntities.map((se, i) => (
            <div key={i} className="cell-row">
              <button className="entity-select-btn" onClick={() => setOpenPicker({ kind: 'secondary', index: i })}>
                {se.entityId ? (
                  <>
                    {entityLabel(se.entityId).domain && (
                      <span className="entity-domain">{entityLabel(se.entityId).domain}</span>
                    )}
                    <span className="entity-name">{entityLabel(se.entityId).name}</span>
                  </>
                ) : (
                  <span className="entity-placeholder">Pick an entity...</span>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="entity-chevron">
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <Input
                type="text"
                value={se.label || ''}
                onChange={(v) => updateSecondary(i, { label: v || undefined })}
                placeholder="Label (optional)"
              />
              <button className="remove-btn" onClick={() => removeSecondary(i)} title="Remove">
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="add-btn" onClick={addSecondary}>
          + Add Secondary Entity
        </button>
      </Field>

      <div className="section-divider" />

      {/* Warning rules */}
      <Field label="Warning Rules">
        {warnings.map((w, i) => (
          <div key={i} className={`warning-item${expandedWarning === i ? ' warning-item--expanded' : ''}`}>
            <div className="warning-item-row">
              <button className="entity-select-btn" onClick={() => setOpenPicker({ kind: 'warning', index: i })}>
                {w.entityId ? (
                  <>
                    {entityLabel(w.entityId).domain && (
                      <span className="entity-domain">{entityLabel(w.entityId).domain}</span>
                    )}
                    <span className="entity-name">{entityLabel(w.entityId).name}</span>
                  </>
                ) : (
                  <span className="entity-placeholder">Pick an entity...</span>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="entity-chevron">
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedWarning(expandedWarning === i ? null : i)}
              >
                {expandedWarning === i ? 'Collapse' : 'Edit'}
              </Button>
              <button className="remove-btn" onClick={() => removeWarning(i)} title="Remove warning">
                ×
              </button>
            </div>

            {expandedWarning === i && (
              <>
                <Field label="Label">
                  <Input
                    type="text"
                    value={w.label}
                    onChange={(v) => updateWarning(i, { label: v || '' })}
                    placeholder="e.g. Door is open"
                  />
                </Field>
                <Field label="Severity">
                  <Select
                    value={w.severity}
                    onChange={(v) => updateWarning(i, { severity: v as 'warning' | 'critical' })}
                    options={[
                      { label: 'Warning (yellow)', value: 'warning' },
                      { label: 'Critical (red)', value: 'critical' },
                    ]}
                  />
                </Field>
                <Field label="Show when">
                  <VisibilityBuilder
                    conditions={w.visibilityConditions ? normalizeToTwoLevel(w.visibilityConditions) : undefined}
                    onChange={(cond: ConditionGroup) => updateWarning(i, { visibilityConditions: cond })}
                    moduleId={moduleId}
                  />
                </Field>
              </>
            )}
          </div>
        ))}
        <button className="add-btn" onClick={addWarning}>
          + Add Warning Rule
        </button>
      </Field>

      {/* Entity pickers */}
      {openPicker?.kind === 'status' && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={config.statusEntity || ''}
          onSelect={(id) => { onConfigChange({ ...config, statusEntity: id }); setOpenPicker(null); }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === 'metric' && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={metricCells[openPicker.index]?.entityId || ''}
          onSelect={(id) => { updateMetricCell(openPicker.index, { entityId: id }); setOpenPicker(null); }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === 'progress' && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={config.progressSource !== 'none' && config.progressSource !== 'calculated' ? (config.progressSource || '') : ''}
          onSelect={(id) => { onConfigChange({ ...config, progressSource: id }); setOpenPicker(null); }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === 'progressElapsed' && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={config.progressElapsedEntity || ''}
          onSelect={(id) => { onConfigChange({ ...config, progressElapsedEntity: id }); setOpenPicker(null); }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === 'progressRemaining' && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={config.progressRemainingEntity || ''}
          onSelect={(id) => { onConfigChange({ ...config, progressRemainingEntity: id }); setOpenPicker(null); }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === 'secondary' && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={secondaryEntities[openPicker.index]?.entityId || ''}
          onSelect={(id) => { updateSecondary(openPicker.index, { entityId: id }); setOpenPicker(null); }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === 'warning' && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={warnings[openPicker.index]?.entityId || ''}
          onSelect={(id) => { updateWarning(openPicker.index, { entityId: id }); setOpenPicker(null); }}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  );
}
