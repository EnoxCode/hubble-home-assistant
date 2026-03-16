import { useState, useEffect } from 'react';
import { EntityPicker } from '../../../shared/entity-picker';
import './configure.css';
import type { PillConfig, DomainGroup } from '../../../shared/types';
import { Input, Field, Select } from 'hubble-ui';

interface ConfigurePanelProps {
  config: PillConfig;
  onConfigChange: (config: PillConfig) => void;
  moduleId: number;
}

export default function ConfigurePanel({ config, onConfigChange, moduleId }: ConfigurePanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [entityMap, setEntityMap] = useState<Map<string, string>>(new Map());

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

  const entityId = config.entityId || '';
  const friendlyName = entityId ? entityMap.get(entityId) : null;
  const domain = entityId ? entityId.split('.')[0] : null;

  return (
    <div>
      <Field label="Entity">
        <button className="configure-panel__entity-chip" onClick={() => setPickerOpen(true)}>
          {friendlyName ? (
            <>
              {domain && <span className="configure-panel__entity-domain">{domain}</span>}
              <span className="configure-panel__entity-name">{friendlyName}</span>
            </>
          ) : (
            <span className="configure-panel__entity-placeholder">Pick an entity...</span>
          )}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="configure-panel__entity-chevron">
            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </Field>

      {pickerOpen && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={entityId}
          onSelect={(id) => { onConfigChange({ ...config, entityId: id }); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <Field label="Display Name" hint="Overrides HA friendly_name">
        <Input type="text" value={config.friendlyName || ''} onChange={(v) => onConfigChange({ ...config, friendlyName: v || undefined })} placeholder="Leave blank to use HA name" />
      </Field>

      <Field label="Variant">
        <Select
          value={config.variant || 'glass'}
          onChange={(v) => onConfigChange({ ...config, variant: v as 'glass' | 'colored' })}
          options={[
            { label: 'Glass (subtle)', value: 'glass' },
            { label: 'Colored (attention)', value: 'colored' },
          ]}
        />
      </Field>

      <Field label="Size">
        <Select
          value={config.size || 'sm'}
          onChange={(v) => onConfigChange({ ...config, size: v as 'sm' | 'lg' })}
          options={[
            { label: 'Small (dense layouts)', value: 'sm' },
            { label: 'Large (hero indicator)', value: 'lg' },
          ]}
        />
      </Field>
    </div>
  );
}
