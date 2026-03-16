import { useState, useEffect } from 'react';
import { EntityPicker } from '../../../shared/entity-picker';
import './configure.css';
import type { ListConfig, DomainGroup } from '../../../shared/types';
import { Button, Input, Field, Select } from 'hubble-ui';

interface ConfigurePanelProps {
  config: ListConfig;
  onConfigChange: (config: ListConfig) => void;
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

  function addEntity(id: string) {
    const current = config.entities || [];
    if (!current.includes(id)) {
      onConfigChange({ ...config, entities: [...current, id] });
    }
    setPickerOpen(false);
  }

  function removeEntity(id: string) {
    onConfigChange({ ...config, entities: (config.entities || []).filter((e) => e !== id) });
  }

  return (
    <div>
      <Field label="Group Name">
        <Input type="text" value={config.groupName || ''} onChange={(v) => onConfigChange({ ...config, groupName: v })} placeholder="e.g. Doors & Locks" />
      </Field>

      <Field label="Display Variant">
        <Select
          value={config.displayVariant || 'badge'}
          onChange={(v) => onConfigChange({ ...config, displayVariant: v as 'dot' | 'badge' })}
          options={[
            { label: 'Badge (tinted text badge)', value: 'badge' },
            { label: 'Dot (colored dot + text)', value: 'dot' },
          ]}
        />
      </Field>

      <Field label="Entities">
        <div className="list-configure__entities">
          {(config.entities || []).map((eid) => (
            <div key={eid} className="list-configure__entity-row">
              <span className="list-configure__entity-name">{entityMap.get(eid) || eid}</span>
              <button className="list-configure__remove-btn" onClick={() => removeEntity(eid)}>x</button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>+ Add entity</Button>
        </div>
      </Field>

      {pickerOpen && (
        <EntityPicker moduleId={moduleId} selectedEntityId="" onSelect={addEntity} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
