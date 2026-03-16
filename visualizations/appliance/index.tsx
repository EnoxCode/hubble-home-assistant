import React, { useState, useEffect, useMemo } from 'react';
import { useConnectorData, useWidgetConfig, useHubbleSDK } from 'hubble-sdk';
import { DashWidget, DashWidgetHeader, DashWidgetFooter } from 'hubble-dash-ui';
import type { ApplianceConfig } from '../../shared/types';
import { evaluateConditions } from '../../shared/types';
import { resolveStateRules, worstStatus } from '../../shared/state-utils';
import { getMdiPath } from '../../shared/mdi-utils';
import './appliance.css';

interface StateChangePayload {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

const MAX_WARNINGS = 3;

type BorderVariant = 'positive' | 'warning' | 'critical' | 'neutral';

function colorToBorderVariant(color: string | undefined): BorderVariant {
  if (!color) return 'neutral';
  if (color === '#4ade80') return 'positive';
  if (color === '#fbbf24') return 'warning';
  if (color === '#f87171') return 'critical';
  return 'neutral';
}

export default function ApplianceWidget() {
  const config = useWidgetConfig<ApplianceConfig>();
  const sdk = useHubbleSDK();

  const anyStateChange = useConnectorData<StateChangePayload>(
    'home-assistant',
    'home-assistant:state_changed',
  );

  const [entityStates, setEntityStates] = useState<Map<string, StateChangePayload>>(new Map());
  const [lastSyncMs, setLastSyncMs] = useState<number | undefined>(undefined);

  // Collect all entity IDs referenced in config
  const allEntityIds = useMemo(() => {
    const ids = new Set<string>();
    if (config.statusEntity) ids.add(config.statusEntity);
    for (const cell of config.metricCells || []) ids.add(cell.entityId);
    if (config.progressSource && config.progressSource !== 'none') ids.add(config.progressSource);
    for (const se of config.secondaryEntities || []) ids.add(se.entityId);
    for (const w of config.warnings || []) ids.add(w.entityId);
    return ids;
  }, [config]);

  // Fetch initial cached state for each entity on mount
  useEffect(() => {
    for (const eid of allEntityIds) {
      sdk.requestLatestData('home-assistant', `home-assistant:state_changed:${eid}`)
        .then((data: unknown) => {
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
  }, [Array.from(allEntityIds).join(',')]);

  // Track live state changes
  useEffect(() => {
    if (anyStateChange && allEntityIds.has(anyStateChange.entity_id)) {
      setEntityStates((prev) => {
        const next = new Map(prev);
        next.set(anyStateChange.entity_id, anyStateChange);
        return next;
      });
      setLastSyncMs(Date.now());
    }
  }, [anyStateChange, allEntityIds]);

  // Build state string map for evaluateConditions
  const stateStrings = useMemo(() => {
    const map = new Map<string, string>();
    for (const [eid, data] of entityStates) {
      map.set(eid, data.state);
    }
    return map;
  }, [entityStates]);

  // Widget-level visibility
  const visible = useMemo(() => {
    return evaluateConditions(config.visibilityConditions, stateStrings);
  }, [config.visibilityConditions, stateStrings]);

  if (!visible) return null;

  // Status resolution
  const statusData = config.statusEntity ? entityStates.get(config.statusEntity) : undefined;
  const statusState = statusData?.state ?? '';
  const statusResolved = resolveStateRules(statusState, statusData?.attributes ?? {}, config.statusRules || []);
  const borderVariant = colorToBorderVariant(statusResolved?.color);
  const statusLabel = statusResolved?.label ?? statusState;
  const isRunning = borderVariant !== 'neutral';

  // Icon path
  const iconPath = getMdiPath(config.icon);

  // Metric cells
  const metricCells = config.metricCells || [];

  // Progress
  const hasProgress = config.progressSource && config.progressSource !== 'none';
  const progressData = hasProgress ? entityStates.get(config.progressSource) : undefined;
  const progressPercent = hasProgress
    ? Math.max(0, Math.min(100, parseFloat(progressData?.state ?? '0') || 0))
    : 0;

  // Secondary entities
  const secondaryEntities = config.secondaryEntities || [];
  const secondaryText = secondaryEntities
    .map((se) => {
      const data = entityStates.get(se.entityId);
      if (!data) return null;
      return se.label || data.attributes?.friendly_name || data.state;
    })
    .filter(Boolean)
    .join(' \u00b7 ');

  // Warnings
  const activeWarnings = (config.warnings || []).filter((w) =>
    evaluateConditions(w.visibilityConditions, stateStrings),
  );
  const visibleWarnings = activeWarnings.slice(0, MAX_WARNINGS);
  const overflowCount = activeWarnings.length - MAX_WARNINGS;

  // Status dot aggregation
  const resolvedColors: string[] = [];
  if (statusResolved?.color) resolvedColors.push(statusResolved.color);
  const dotStatus = activeWarnings.length > 0 ? 'warn' : worstStatus(resolvedColors);

  return (
    <DashWidget statusBorder={borderVariant}>
      <DashWidgetHeader label={config.name || ''} meta={statusLabel} />

      {isRunning && (
        <>
          {/* Icon */}
          {iconPath && (
            <svg className="ha-appliance-icon" width="24" height="24" viewBox="0 0 24 24">
              <path d={iconPath} fill="currentColor" />
            </svg>
          )}

          {/* Metric strip */}
          {metricCells.length > 0 && (
            <div className="ha-appliance-strip">
              {metricCells.map((cell) => {
                const data = entityStates.get(cell.entityId);
                const value = data?.state ?? '—';
                const unit = (data?.attributes?.unit_of_measurement as string) ?? '';
                return (
                  <div key={cell.entityId} className="ha-appliance-cell">
                    <div className="ha-appliance-cell-label">{cell.label.toUpperCase()}</div>
                    <div className="t-glance-sm">
                      {value}
                      {unit && unit}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress bar */}
          {hasProgress && (
            <div className="ha-appliance-progress">
              <div
                className="ha-appliance-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Secondary details */}
          {secondaryText && (
            <div className="ha-appliance-secondary">{secondaryText}</div>
          )}

          {/* Warnings */}
          {visibleWarnings.map((w, i) => (
            <div key={i} className={`ha-appliance-warning ha-appliance-warning--${w.severity}`}>
              {w.icon && (
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path d={getMdiPath(w.icon)} fill="currentColor" />
                </svg>
              )}
              <span className={`ha-appliance-warning-text--${w.severity}`}>{w.label}</span>
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="ha-appliance-warning-overflow">
              +{overflowCount} more warning{overflowCount !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}

      {/* Off state: just icon dimmed */}
      {!isRunning && iconPath && (
        <svg className="ha-appliance-icon ha-appliance-icon--off" width="24" height="24" viewBox="0 0 24 24">
          <path d={iconPath} fill="currentColor" />
        </svg>
      )}

      <DashWidgetFooter updatedAt={lastSyncMs} status={dotStatus} />
    </DashWidget>
  );
}
