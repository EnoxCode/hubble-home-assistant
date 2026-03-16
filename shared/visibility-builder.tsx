import { useState, useEffect } from 'react';
import type { ConditionGroup, Condition, DomainGroup } from './types';
import { isConditionGroup } from './types';
import { EntityPicker } from './entity-picker';
import './visibility-builder.css';

export interface VisibilityBuilderProps {
  conditions?: ConditionGroup;
  onChange: (conditions: ConditionGroup) => void;
  moduleId: number;
}

const OPERATORS = [
  { value: 'equals',       label: 'equals' },
  { value: 'not_equals',   label: 'does not equal' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than',    label: 'less than' },
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'is_empty',     label: 'is empty' },
] as const;

function createEmptyCondition(): Condition {
  return { entity_id: '', operator: 'equals', value: '' };
}

function createEmptyGroup(): ConditionGroup {
  return { operator: 'AND', conditions: [createEmptyCondition()] };
}

function getInnerGroups(root: ConditionGroup | undefined): ConditionGroup[] {
  if (root === undefined) return [createEmptyGroup()];
  if (root.conditions.length === 0) return [];
  return root.conditions.filter(isConditionGroup) as ConditionGroup[];
}

function buildRoot(groups: ConditionGroup[]): ConditionGroup {
  return { operator: 'AND', conditions: groups };
}

interface PickerTarget { gi: number; ci: number }

export function VisibilityBuilder({ conditions, onChange, moduleId }: VisibilityBuilderProps) {
  const [groups, setGroups] = useState<ConditionGroup[]>(() => getInnerGroups(conditions));
  const [entityMap, setEntityMap] = useState<Map<string, string>>(new Map());
  const [openPickerFor, setOpenPickerFor] = useState<PickerTarget | null>(null);

  useEffect(() => {
    fetch(`/api/modules/${moduleId}/entities`)
      .then((r) => r.json())
      .then((data: { domains: DomainGroup[] }) => {
        const map = new Map<string, string>();
        for (const d of data.domains) {
          for (const e of d.entities) {
            map.set(e.entity_id, e.friendly_name);
          }
        }
        setEntityMap(map);
      })
      .catch(() => {/* silently fail — entity names just won't resolve */});
  }, [moduleId]);

  const updateGroups = (next: ConditionGroup[]) => {
    setGroups(next);
    onChange(buildRoot(next));
  };

  const updateGroup = (gi: number, updated: ConditionGroup) => {
    updateGroups(groups.map((g, i) => (i === gi ? updated : g)));
  };

  const removeGroup = (gi: number) => {
    updateGroups(groups.filter((_, i) => i !== gi));
  };

  const addGroup = () => {
    updateGroups([...groups, createEmptyGroup()]);
  };

  const handleEntitySelect = (entityId: string) => {
    if (!openPickerFor) return;
    const { gi, ci } = openPickerFor;
    const group = groups[gi];
    const conds = group.conditions as Condition[];
    const nextConds = conds.map((c, i) => (i === ci ? { ...c, entity_id: entityId } : c));
    updateGroup(gi, { ...group, conditions: nextConds });
    setOpenPickerFor(null);
  };

  return (
    <div className="vb">
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && (
            <div className="vb-outer-join" data-testid="outer-join-divider">
              <div className="vb-outer-line" />
              <span className="vb-outer-label">and</span>
              <div className="vb-outer-line" />
            </div>
          )}
          <GroupBlock
            group={group}
            groupLabel={`Group ${gi + 1}`}
            entityMap={entityMap}
            onUpdate={(updated) => updateGroup(gi, updated)}
            onRemove={() => removeGroup(gi)}
            onOpenPicker={(ci) => setOpenPickerFor({ gi, ci })}
          />
        </div>
      ))}

      <button className="vb-add-group-btn" onClick={addGroup}>+ Add group</button>

      {openPickerFor && (
        <EntityPicker
          moduleId={moduleId}
          selectedEntityId={
            (groups[openPickerFor.gi].conditions[openPickerFor.ci] as Condition).entity_id
          }
          onSelect={handleEntitySelect}
          onClose={() => setOpenPickerFor(null)}
        />
      )}
    </div>
  );
}

interface GroupBlockProps {
  group: ConditionGroup;
  groupLabel: string;
  entityMap: Map<string, string>;
  onUpdate: (updated: ConditionGroup) => void;
  onRemove: () => void;
  onOpenPicker: (conditionIndex: number) => void;
}

function GroupBlock({ group, groupLabel, entityMap, onUpdate, onRemove, onOpenPicker }: GroupBlockProps) {
  const conditions = group.conditions as Condition[];

  const setOperator = (op: 'AND' | 'OR') => onUpdate({ ...group, operator: op });

  const addCondition = () => {
    onUpdate({ ...group, conditions: [...conditions, createEmptyCondition()] });
  };

  const updateCondition = (ci: number, updated: Condition) => {
    onUpdate({ ...group, conditions: conditions.map((c, i) => (i === ci ? updated : c)) });
  };

  const removeCondition = (ci: number) => {
    onUpdate({ ...group, conditions: conditions.filter((_, i) => i !== ci) });
  };

  return (
    <div className="vb-group">
      <div className="vb-group-header">
        <span className="vb-group-label">{groupLabel}</span>
        <div className="vb-segment">
          <button
            className={`vb-segment-btn${group.operator === 'AND' ? ' vb-segment-btn--active' : ''}`}
            onClick={() => setOperator('AND')}
          >
            ALL
          </button>
          <button
            className={`vb-segment-btn${group.operator === 'OR' ? ' vb-segment-btn--active' : ''}`}
            onClick={() => setOperator('OR')}
          >
            ANY
          </button>
        </div>
        <button className="vb-group-remove" aria-label="Remove group" onClick={onRemove}>×</button>
      </div>

      {conditions.map((cond, ci) => (
        <ConditionRow
          key={ci}
          condition={cond}
          entityMap={entityMap}
          onOpenPicker={() => onOpenPicker(ci)}
          onUpdate={(updated) => updateCondition(ci, updated)}
          onRemove={() => removeCondition(ci)}
        />
      ))}

      <button className="vb-add-cond-btn" onClick={addCondition}>+ Add condition</button>
    </div>
  );
}

interface ConditionRowProps {
  condition: Condition;
  entityMap: Map<string, string>;
  onOpenPicker: () => void;
  onUpdate: (updated: Condition) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, entityMap, onOpenPicker, onUpdate, onRemove }: ConditionRowProps) {
  const friendlyName = condition.entity_id
    ? (entityMap.get(condition.entity_id) ?? condition.entity_id)
    : null;

  return (
    <div className="vb-condition-row">
      <button
        className={`vb-entity-chip${!condition.entity_id ? ' vb-entity-chip--empty' : ''}`}
        onClick={onOpenPicker}
      >
        {friendlyName ?? 'Pick entity…'}
      </button>

      <select
        className="vb-operator-select"
        value={condition.operator}
        onChange={(e) => onUpdate({ ...condition, operator: e.target.value as Condition['operator'] })}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {condition.operator !== 'is_empty' && (
        <input
          className="vb-value-input"
          placeholder="Value"
          value={condition.value ?? ''}
          onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
        />
      )}

      <button className="vb-remove-btn" aria-label="Remove condition" onClick={onRemove}>×</button>
    </div>
  );
}
