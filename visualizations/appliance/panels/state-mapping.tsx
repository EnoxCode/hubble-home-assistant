import { StateRuleBuilder } from '../../../shared/state-rule-builder';
import type { ApplianceConfig } from '../../../shared/types';
import type { StateRule } from '../../../shared/types';
import './configure.css';

interface StateMappingPanelProps {
  config: ApplianceConfig;
  onConfigChange: (config: ApplianceConfig) => void;
  moduleId: number;
}

export default function StateMappingPanel({ config, onConfigChange, moduleId }: StateMappingPanelProps) {
  const rules: StateRule[] = config.statusRules || [];

  const handleChange = (newRules: StateRule[]) => {
    onConfigChange({ ...config, statusRules: newRules });
  };

  return (
    <div>
      <p className="ha-state-mapping-hint">
        Map the status entity&apos;s state values to border colors. First matching rule wins.
      </p>
      <StateRuleBuilder
        rules={rules}
        onChange={handleChange}
        moduleId={moduleId}
        entityMode="implicit"
        showIcon={false}
        showLabel={true}
        showColor={true}
      />
    </div>
  );
}
