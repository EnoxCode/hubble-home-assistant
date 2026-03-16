import { useState } from 'react';
import { VisibilityBuilder } from '../../../shared/visibility-builder';
import { normalizeToTwoLevel } from '../../../shared/types';
import type { NotificationConfig, ConditionGroup } from '../../../shared/types';
import '../../../shared/ha-shared.css';

interface VisibilityPanelProps {
  config: NotificationConfig;
  onConfigChange: (config: NotificationConfig) => void;
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
      <div className="ha-panel-actions">
        <button onClick={() => setDraft(config.visibilityConditions ? normalizeToTwoLevel(config.visibilityConditions) : undefined)} className="ha-btn-cancel">
          Cancel
        </button>
        <button
          onClick={() => onConfigChange({ ...config, visibilityConditions: draft })}
          className="ha-btn-save"
        >
          Save
        </button>
      </div>
    </div>
  );
}
