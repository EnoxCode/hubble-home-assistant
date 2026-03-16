// Re-export from state-utils for convenience
export type { StateMapEntry } from './state-utils';
import type { StateMapEntry } from './state-utils';

export interface StateMappingEntry {
  state: string;
  color: string;
  icon: string;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}

export interface Condition {
  entity_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'greater_than' | 'less_than';
  value?: string;
}

export interface PillConfig {
  entityId: string;
  friendlyName?: string;
  variant: 'glass' | 'colored';
  size: 'sm' | 'lg';
  stateMap: StateMapEntry[];
  stateRules?: StateRule[];
  visibilityConditions?: ConditionGroup;
  // Legacy fields (kept for migration)
  entity_id?: string;
  title?: string;
  defaultIcon?: string;
  stateMappings?: StateMappingEntry[];
}

export interface NotificationConfig {
  maxVisible: number;
  maxNotifications?: number; // Legacy fallback
  visibilityConditions?: ConditionGroup;
}

export interface HANotification {
  notification_id: string;
  title: string;
  message: string;
  created_at: string;
}

export interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

export interface DomainGroup {
  domain: string;
  entities: { entity_id: string; state: string; friendly_name: string }[];
}

export interface ListConfig {
  groupName: string;
  entities: string[];
  displayVariant: 'dot' | 'badge';
  maxItems: number;
  stateMap?: StateMapEntry[];
  stateRules?: StateRule[];
  visibilityConditions?: ConditionGroup;
}

// === State Rule System (universal) ===

export interface StateRule {
  entityId?: string;          // for 'select' mode (list)
  bindingVariable?: string;   // for 'bindings' mode (text)
  evaluateAttribute?: string; // if set, evaluates attribute instead of state
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'between' | 'contains';
  value: string;
  valueTo?: string;           // upper bound for 'between'
  color: string;              // hex color
  icon?: string;              // MDI icon override
  label?: string;             // label override
}

export interface EntityBinding {
  variable: string;
  entityId: string;
  attribute?: string;
}

// === Minimap Types ===

export interface MinimapConfig {
  size: 'md' | 'lg';
  floors: FloorConfig[];
  activeFloor: number;
  layers: LayerConfig;
  display: DisplayConfig;
}

export interface FloorConfig {
  id: string;
  name: string;
  svgUrl: string;
  entities: EntityPin[];
  textLabels: TextLabel[];
  roomZones: RoomZone[];
  polygons: PolygonShape[];
}

export interface EntityPin {
  id: string;
  entityId: string;
  x: number;
  y: number;
  icon: string;
  label?: string;
  showOnMinimap: boolean;
  showOnExpanded: boolean;
  showLabel: boolean;
  stateRules: StateRule[];
  expandedScale?: number;
  visibilityConditions?: ConditionGroup;
}

export interface TextLabel {
  id: string;
  mode: 'entity_value' | 'static';
  x: number;
  y: number;
  bindings?: EntityBinding[];
  formatTemplate?: string;
  staticText?: string;
  fontSize: 'sm' | 'md' | 'lg';
  color: string;
  showOnMinimap: boolean;
  showOnExpanded: boolean;
  colorRules: StateRule[];
  visibilityConditions?: ConditionGroup;
}

export interface RoomZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tempEntityId?: string;
  humidityEntityId?: string;
  presenceEntities: string[];
  securityOverride: boolean;
  securityEntityId?: string;
  lightEntities: string[];
  showZoneBorder: boolean;
  showOnMinimap: boolean;
  showOnExpanded: boolean;
}

export interface PolygonShape {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  fillColor: string;
  fillOpacity: number;
  borderStyle: 'none' | 'solid' | 'dashed';
  borderColor: string;
  borderWidth: number;
  dynamicEntity?: string;
  dynamicRules: StateRule[];
  showOnMinimap: boolean;
  showOnExpanded: boolean;
  visibilityConditions?: ConditionGroup;
}

export interface LayerConfig {
  presenceRings: {
    enabled: boolean;
    showOnMinimap: boolean;
    showOnExpanded: boolean;
    ringStyle: 'solid' | 'dashed';
  };
  lightAmbiance: {
    enabled: boolean;
    showOnMinimap: boolean;
    showOnExpanded: boolean;
    glowIntensity: number;
  };
  securityZones: {
    enabled: boolean;
    showOnMinimap: boolean;
    showOnExpanded: boolean;
    alarmEntityId: string;
  };
  activityTrail: {
    enabled: boolean;
    showOnMinimap: boolean;
    showOnExpanded: boolean;
    durationMinutes: 5 | 10 | 15 | 30;
  };
}

export interface DisplayConfig {
  floorPlanOpacity: number;
  inactiveIconOpacity: number;
  autoSwitchFloorOnActivity: boolean;
  enableAnimations: boolean;
  maxHeight?: number;               // max widget height in px (0 = no limit)
}

export function isConditionGroup(item: Condition | ConditionGroup): item is ConditionGroup {
  return 'operator' in item && 'conditions' in item && (item as ConditionGroup).operator !== undefined && Array.isArray((item as ConditionGroup).conditions);
}

export function evaluateConditions(
  group: ConditionGroup | undefined,
  states: Map<string, string>,
): boolean {
  if (!group || !group.conditions || group.conditions.length === 0) return true;

  const results = group.conditions.map((item) => {
    if (isConditionGroup(item)) {
      return evaluateConditions(item, states);
    }

    const entityState = states.get(item.entity_id) ?? '';

    switch (item.operator) {
      case 'equals':
        return entityState === (item.value ?? '');
      case 'not_equals':
        return entityState !== (item.value ?? '');
      case 'contains':
        return entityState.includes(item.value ?? '');
      case 'not_contains':
        return !entityState.includes(item.value ?? '');
      case 'is_empty':
        return entityState === '' || entityState === undefined;
      case 'greater_than': {
        const num = parseFloat(entityState);
        const target = parseFloat(item.value ?? '');
        return !isNaN(num) && !isNaN(target) && num > target;
      }
      case 'less_than': {
        const num = parseFloat(entityState);
        const target = parseFloat(item.value ?? '');
        return !isNaN(num) && !isNaN(target) && num < target;
      }
      default:
        return true;
    }
  });

  if (group.operator === 'AND') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

// === Appliance Visualization ===

export interface MetricCell {
  /** Label shown above the value (e.g., 'Temp', 'Time') */
  label: string;
  /** HA entity ID */
  entityId: string;
  /** Format the state value: 'raw' (default) or 'titlecase' (snake_case → Title Case) */
  formatState?: 'raw' | 'titlecase';
}

export interface SecondaryEntity {
  /** HA entity ID */
  entityId: string;
  /** Optional label override (otherwise uses entity friendly_name) */
  label?: string;
}

export interface WarningRule {
  /** HA entity ID that triggers the warning */
  entityId: string;
  /** MDI icon name for the warning (e.g., 'mdi:door-open') */
  icon?: string;
  /** Warning text to display */
  label: string;
  /** Severity: warning (yellow) or critical (red) */
  severity: 'warning' | 'critical';
  /** Conditions that must be met for warning to appear */
  visibilityConditions: ConditionGroup;
}

export interface ApplianceConfig {
  /** Widget display name */
  name: string;
  /** MDI icon name (e.g., 'mdi:stove') */
  icon: string;
  /** Entity that drives overall status (border color + header status text) */
  statusEntity?: string;
  /** State rules for the status entity — maps state values to border color */
  statusRules: StateRule[];
  /** Ordered metric cells shown in the strip (1–4) */
  metricCells: MetricCell[];
  /** Progress mode: 'none', 'entity' (0–100 value), or 'calculated' (elapsed + remaining) */
  progressSource: string;
  /** Entity providing elapsed time in minutes (for calculated progress) */
  progressElapsedEntity?: string;
  /** Entity providing remaining time in minutes (for calculated progress) */
  progressRemainingEntity?: string;
  /** Additional entities shown as secondary meta text */
  secondaryEntities: SecondaryEntity[];
  /** Warning rules — shown when visibility condition is met */
  warnings: WarningRule[];
  /** Visibility conditions for the entire widget */
  visibilityConditions?: ConditionGroup;
}

export function normalizeToTwoLevel(root: ConditionGroup): ConditionGroup {
  const bareConditions = root.conditions.filter(
    (c): c is Condition => !isConditionGroup(c),
  );
  const innerGroups = root.conditions.filter(
    (c): c is ConditionGroup => isConditionGroup(c),
  );
  if (bareConditions.length === 0) return root;
  const wrappedGroup: ConditionGroup = {
    operator: root.operator,
    conditions: bareConditions,
  };
  return { operator: 'AND', conditions: [wrappedGroup, ...innerGroups] };
}
