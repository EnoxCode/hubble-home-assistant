import { StateRuleBuilder } from '../../../shared/state-rule-builder';
import type { ListConfig } from '../../../shared/types';
import type { StateRule } from '../../../shared/types';
import type { StateMapEntry } from '../../../shared/state-utils';

interface StateMappingPanelProps {
  config: ListConfig;
  onConfigChange: (config: ListConfig) => void;
  moduleId: number;
}

function migrateStateMap(stateMap: StateMapEntry[]): StateRule[] {
  return stateMap.map((m) => ({
    operator: '=' as const,
    value: m.state,
    color: m.color,
    icon: m.icon,
    label: m.label || m.state,
  }));
}

export default function StateMappingPanel({ config, onConfigChange, moduleId }: StateMappingPanelProps) {
  const rules: StateRule[] = config.stateRules || migrateStateMap(config.stateMap || []);

  const handleChange = (newRules: StateRule[]) => {
    onConfigChange({ ...config, stateRules: newRules });
  };

  return (
    <StateRuleBuilder
      rules={rules}
      onChange={handleChange}
      moduleId={moduleId}
      entityMode="select"
      entities={config.entities || []}
      showIcon={true}
      showLabel={true}
      showColor={true}
    />
  );
}
