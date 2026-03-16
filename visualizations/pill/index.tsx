import React, { useState, useEffect, useMemo } from 'react';
import { useConnectorData, useWidgetConfig } from 'hubble-sdk';
import Icon from '@mdi/react';
import { getMdiPath } from '../../shared/mdi-utils';
import type { PillConfig } from '../../shared/types';
import { evaluateConditions } from '../../shared/types';
import { resolveStateColor, resolveStateRules } from '../../shared/state-utils';
import type { StateMapEntry } from '../../shared/state-utils';
import './pill.css';

interface StateChangePayload {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

export default function PillWidget() {
  const config = useWidgetConfig<PillConfig>();
  const entityId = config.entityId || config.entity_id || '';
  const entityState = useConnectorData<StateChangePayload>(
    'home-assistant',
    `home-assistant:state_changed:${entityId}`,
  );
  const anyStateChange = useConnectorData<StateChangePayload>(
    'home-assistant',
    'home-assistant:state_changed',
  );
  const [entityStates, setEntityStates] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (anyStateChange) {
      setEntityStates((prev) => {
        const next = new Map(prev);
        next.set(anyStateChange.entity_id, anyStateChange.state);
        return next;
      });
    }
  }, [anyStateChange]);

  const visible = useMemo(() => {
    return evaluateConditions(config.visibilityConditions, entityStates);
  }, [config.visibilityConditions, entityStates]);

  if (!visible) return null;

  const stateValue = entityState?.state || '';
  const stateMap: StateMapEntry[] = config.stateMap || [];
  const resolved = config.stateRules
    ? resolveStateRules(stateValue, entityState?.attributes ?? {}, config.stateRules)
    : resolveStateColor(stateValue, stateMap);
  const stateColor = resolved?.color || '';
  const iconName = resolved?.icon || '';
  const iconPath = getMdiPath(iconName);
  const displayValue = resolved?.label || stateValue;

  const displayName =
    config.friendlyName ||
    config.title ||
    (entityState?.attributes?.friendly_name as string) ||
    entityId;

  const isColored = (config.variant || 'glass') === 'colored';
  const isLg = (config.size || 'sm') === 'lg';

  const pillClasses = [
    'ha-pill',
    isLg && 'ha-pill--lg',
    isColored && 'ha-pill--colored',
  ]
    .filter(Boolean)
    .join(' ');

  const cssVars = stateColor
    ? ({ '--ha-state-color': stateColor } as React.CSSProperties)
    : undefined;

  return (
    <div className={pillClasses} style={cssVars}>
      {iconPath && (
        <span className="ha-pill-icon">
          <Icon path={iconPath} size="1em" />
        </span>
      )}
      <span className="ha-pill-name">{displayName}</span>
      <span className="ha-pill-sep">&middot;</span>
      <span className="ha-pill-value">
        {displayValue}
      </span>
    </div>
  );
}
