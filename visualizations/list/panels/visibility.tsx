import type { ListConfig, ConditionGroup } from '../../../shared/types';
import { VisibilityBuilder } from '../../../shared/visibility-builder';

interface VisibilityPanelProps {
  config: ListConfig;
  onConfigChange: (config: ListConfig) => void;
  moduleId: number;
}

export default function VisibilityPanel({ config, onConfigChange, moduleId }: VisibilityPanelProps) {
  return (
    <VisibilityBuilder
      moduleId={moduleId}
      conditions={config.visibilityConditions}
      onChange={(conditions: ConditionGroup | undefined) =>
        onConfigChange({ ...config, visibilityConditions: conditions })
      }
    />
  );
}
