import React, { useState, useEffect, useMemo } from 'react';
import { useConnectorData, useWidgetConfig, useHubbleSDK } from 'hubble-sdk';
import { DashWidget, DashWidgetHeader, DashWidgetFooter } from 'hubble-dash-ui';
import type { ListConfig } from '../../shared/types';
import { evaluateConditions } from '../../shared/types';
import { resolveStateColor, resolveStateRules, worstStatus } from '../../shared/state-utils';
import type { StateMapEntry } from '../../shared/state-utils';
import './list.css';

interface StateChangePayload {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

export default function ListWidget() {
  const config = useWidgetConfig<ListConfig>();
  const sdk = useHubbleSDK();

  const anyStateChange = useConnectorData<StateChangePayload>(
    'home-assistant',
    'home-assistant:state_changed',
  );
  const [entityStates, setEntityStates] = useState<Map<string, StateChangePayload>>(new Map());
  const [lastSyncMs, setLastSyncMs] = useState<number | undefined>(undefined);

  const entityIds = config.entities || [];
  const entityIdSet = useMemo(() => new Set(entityIds), [entityIds]);

  // Fetch initial cached state for each entity on mount
  useEffect(() => {
    for (const eid of entityIds) {
      sdk.requestLatestData('home-assistant', `home-assistant:state_changed:${eid}`)
        .then((data) => {
          if (data) {
            const payload = data as StateChangePayload;
            setEntityStates((prev) => {
              const next = new Map(prev);
              next.set(payload.entity_id, payload);
              return next;
            });
            setLastSyncMs(Date.now());
          }
        })
        .catch(() => {});
    }
  }, [entityIds.join(',')]);

  // Track live state changes
  useEffect(() => {
    if (anyStateChange && entityIdSet.has(anyStateChange.entity_id)) {
      setEntityStates((prev) => {
        const next = new Map(prev);
        next.set(anyStateChange.entity_id, anyStateChange);
        return next;
      });
      setLastSyncMs(Date.now());
    }
  }, [anyStateChange, entityIdSet]);

  const stateStrings = useMemo(() => {
    const map = new Map<string, string>();
    for (const [eid, data] of entityStates) {
      map.set(eid, data.state);
    }
    return map;
  }, [entityStates]);

  const visible = useMemo(() => {
    return evaluateConditions(config.visibilityConditions, stateStrings);
  }, [config.visibilityConditions, stateStrings]);

  if (!visible) return null;

  const stateMap: StateMapEntry[] = config.stateMap || [];
  const maxItems = config.maxItems || 8;
  const displayVariant = config.displayVariant || 'badge';
  const visibleEntities = entityIds.slice(0, maxItems);

  const resolvedColors: string[] = [];

  const rows = visibleEntities.map((eid) => {
    const data = entityStates.get(eid);
    const stateValue = data?.state || '';
    const friendlyName = (data?.attributes?.friendly_name as string) || eid;
    // If stateRules exist, filter to rules for this entity (or rules with no entityId).
    // Fall back to legacy stateMap if no stateRules.
    const resolved = config.stateRules
      ? resolveStateRules(stateValue, data?.attributes ?? {}, config.stateRules.filter((r) => !r.entityId || r.entityId === eid))
      : resolveStateColor(stateValue, stateMap);
    const stateColor = resolved?.color || '';
    const displayValue = resolved?.label || stateValue;
    resolvedColors.push(stateColor);

    return { eid, friendlyName, displayValue, stateColor };
  });

  const dotStatus = worstStatus(resolvedColors);

  return (
    <DashWidget>
      <DashWidgetHeader label={config.groupName || ''} />

      {rows.map(({ eid, friendlyName, displayValue, stateColor }) => {
        const cssVars = stateColor
          ? ({ '--ha-state-color': stateColor } as React.CSSProperties)
          : undefined;
        return (
          <div key={eid} className="ha-list-row" style={cssVars}>
            <span className="ha-list-name">{friendlyName}</span>
            {displayVariant === 'dot' ? (
              <div className="ha-list-state">
                <div className="ha-list-dot" />
                <span className="ha-list-value">{displayValue}</span>
              </div>
            ) : (
              <div className="ha-list-badge">{displayValue}</div>
            )}
          </div>
        );
      })}

      <DashWidgetFooter updatedAt={lastSyncMs} status={dotStatus} />
    </DashWidget>
  );
}
