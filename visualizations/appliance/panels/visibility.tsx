import { useState } from 'react';
import { VisibilityBuilder } from '../../../shared/visibility-builder';
import { normalizeToTwoLevel } from '../../../shared/types';
import './visibility.css';
import type { ApplianceConfig, ConditionGroup } from '../../../shared/types';
import { Button } from 'hubble-ui';

interface VisibilityPanelProps {
  config: ApplianceConfig;
  onConfigChange: (config: ApplianceConfig) => void;
  moduleId: number;
}

export default function VisibilityPanel({ config, onConfigChange, moduleId }: VisibilityPanelProps) {
  const [draft, setDraft] = useState<ConditionGroup | undefined>(() =>
    config.visibilityConditions
      ? normalizeToTwoLevel(config.visibilityConditions)
      : undefined,
  );

  return (
    <div>
      <VisibilityBuilder
        conditions={draft}
        onChange={setDraft}
        moduleId={moduleId}
      />
      <div className="visibility-panel__actions">
        <Button variant="ghost" size="sm" onClick={() => setDraft(config.visibilityConditions ? normalizeToTwoLevel(config.visibilityConditions) : undefined)}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={() => onConfigChange({ ...config, visibilityConditions: draft })}>
          Save
        </Button>
      </div>
    </div>
  );
}
