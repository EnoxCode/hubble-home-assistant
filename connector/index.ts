import type { ServerSdk } from '../hubble-sdk';
import type { EntityState, HANotification } from '../shared/types';

interface HAWebSocketMessage {
  type: string;
  id?: number;
  success?: boolean;
  result?: unknown;
  event?: {
    event_type?: string;
    data?: Record<string, unknown>;
    variables?: { trigger?: { to_state?: EntityState } };
  };
}

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

export default function homeAssistantConnector(sdk: ServerSdk) {
  const config = sdk.getConfig();
  const haUrl = config.ha_url as string;
  const haToken = config.ha_token as string;

  if (!haUrl || !haToken) {
    sdk.log.error('Missing ha_url or ha_token configuration');
    return;
  }

  let ws: WebSocket | null = null;
  let msgId = 1;
  let reconnectDelay = 1000;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let notificationPollTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  // Cached entity list from get_states
  let cachedEntities: HAEntity[] = [];
  // Set of entity IDs we care about
  let watchedEntities = new Set<string>();
  // Pending message callbacks
  const pendingCallbacks = new Map<number, (msg: HAWebSocketMessage) => void>();

  function getWsUrl(): string {
    const url = haUrl.replace(/\/$/, '');
    const wsUrl = url.replace(/^http/, 'ws');
    return `${wsUrl}/api/websocket`;
  }

  function sendMessage(msg: Record<string, unknown>): number {
    const id = msgId++;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ...msg, id }));
    }
    return id;
  }

  function sendMessageWithCallback(msg: Record<string, unknown>, callback: (response: HAWebSocketMessage) => void): number {
    const id = sendMessage(msg);
    pendingCallbacks.set(id, callback);
    return id;
  }

  function collectWatchedEntities(): Set<string> {
    const watched = new Set<string>();
    const widgetConfigs = sdk.getWidgetConfigs() as Array<Record<string, unknown>>;

    for (const wc of widgetConfigs) {
      // Single entity (pill) - both old and new field names
      if (typeof wc.entity_id === 'string' && wc.entity_id) watched.add(wc.entity_id);
      if (typeof wc.entityId === 'string' && wc.entityId) watched.add(wc.entityId);
      // Multiple entities (list)
      if (Array.isArray(wc.entities)) {
        for (const eid of wc.entities) {
          if (typeof eid === 'string') watched.add(eid);
        }
      }
      // Visibility condition entities
      collectConditionEntities(wc.visibilityConditions, watched);

      // Minimap: floors[].entities[].entityId, floors[].roomZones, floors[].textLabels, floors[].polygons
      if (Array.isArray(wc.floors)) {
        for (const floor of wc.floors as Array<Record<string, unknown>>) {
          // Entity pins
          if (Array.isArray(floor.entities)) {
            for (const pin of floor.entities as Array<Record<string, unknown>>) {
              if (typeof pin.entityId === 'string' && pin.entityId) watched.add(pin.entityId);
              collectConditionEntities(pin.visibilityConditions, watched);
            }
          }
          // Room zones: temp, humidity, presence, security, light entities
          if (Array.isArray(floor.roomZones)) {
            for (const zone of floor.roomZones as Array<Record<string, unknown>>) {
              if (typeof zone.tempEntityId === 'string') watched.add(zone.tempEntityId);
              if (typeof zone.humidityEntityId === 'string') watched.add(zone.humidityEntityId);
              if (typeof zone.securityEntityId === 'string') watched.add(zone.securityEntityId);
              if (Array.isArray(zone.presenceEntities)) {
                for (const eid of zone.presenceEntities) {
                  if (typeof eid === 'string') watched.add(eid);
                }
              }
              if (Array.isArray(zone.lightEntities)) {
                for (const eid of zone.lightEntities) {
                  if (typeof eid === 'string') watched.add(eid);
                }
              }
            }
          }
          // Text labels: bindings[].entityId
          if (Array.isArray(floor.textLabels)) {
            for (const label of floor.textLabels as Array<Record<string, unknown>>) {
              if (Array.isArray(label.bindings)) {
                for (const b of label.bindings as Array<Record<string, unknown>>) {
                  if (typeof b.entityId === 'string') watched.add(b.entityId);
                }
              }
              collectConditionEntities(label.visibilityConditions, watched);
            }
          }
          // Polygons: dynamicEntity
          if (Array.isArray(floor.polygons)) {
            for (const poly of floor.polygons as Array<Record<string, unknown>>) {
              if (typeof poly.dynamicEntity === 'string') watched.add(poly.dynamicEntity);
              collectConditionEntities(poly.visibilityConditions, watched);
            }
          }
        }
      }
      // Global alarm entity
      const layers = wc.layers as Record<string, unknown> | undefined;
      if (layers) {
        const security = layers.securityZones as Record<string, unknown> | undefined;
        if (security && typeof security.alarmEntityId === 'string') {
          watched.add(security.alarmEntityId);
        }
      }
    }
    return watched;
  }

  function collectConditionEntities(conditions: unknown, set: Set<string>): void {
    if (!conditions || typeof conditions !== 'object') return;
    const group = conditions as { conditions?: unknown[] };
    if (!Array.isArray(group.conditions)) return;

    for (const item of group.conditions) {
      if (!item || typeof item !== 'object') continue;
      const typed = item as { entity_id?: string; conditions?: unknown[] };
      if (typed.entity_id) {
        set.add(typed.entity_id);
      }
      if (Array.isArray(typed.conditions)) {
        collectConditionEntities(typed, set);
      }
    }
  }

  function subscribeToEntities(): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    watchedEntities = collectWatchedEntities();

    if (watchedEntities.size === 0) {
      sdk.log.info('No watched entities configured');
      return;
    }

    // Subscribe to state changes for watched entities using subscribe_trigger
    // Filter out empty strings from unconfigured elements
    const entityIds = Array.from(watchedEntities).filter((id) => id.length > 0);
    if (entityIds.length === 0) {
      sdk.log.info('No valid watched entities after filtering');
      return;
    }
    sdk.log.info(`Subscribing to ${entityIds.length} entities: ${entityIds.join(', ')}`);
    sendMessage({
      type: 'subscribe_trigger',
      trigger: {
        platform: 'state',
        entity_id: entityIds,
      },
    });

    sdk.log.info(`Subscribed to ${entityIds.length} entities: ${entityIds.join(', ')}`);

    // Emit initial states for watched entities from cache
    for (const entityId of entityIds) {
      const entity = cachedEntities.find((e) => e.entity_id === entityId);
      if (entity) {
        const payload = {
          entity_id: entity.entity_id,
          state: entity.state,
          attributes: entity.attributes,
          last_changed: entity.last_changed,
        };
        sdk.emit('home-assistant:state_changed', payload);
        sdk.emit(`home-assistant:state_changed:${entity.entity_id}`, payload);
      }
    }
  }

  function fetchNotifications(): void {
    sendMessageWithCallback(
      { type: 'persistent_notification/get' },
      (response) => {
        if (response.success && Array.isArray(response.result)) {
          const notifications: HANotification[] = (response.result as Record<string, unknown>[]).map((n) => ({
            notification_id: n.notification_id as string,
            title: n.title as string,
            message: n.message as string,
            created_at: n.created_at as string,
          }));
          sdk.emit('home-assistant:notifications', { notifications });
        }
      },
    );
  }

  function subscribeToNotifications(): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    sendMessageWithCallback(
      { type: 'subscribe_events', event_type: 'persistent_notifications_updated' },
      (response) => {
        if (response.success) {
          sdk.log.info('Subscribed to persistent_notifications_updated events');
        } else {
          sdk.log.warn('Failed to subscribe to persistent_notifications_updated');
        }
      },
    );

    // Fetch current persistent notifications
    fetchNotifications();

    // Poll every 60s as fallback in case event subscription misses updates
    if (notificationPollTimer) clearInterval(notificationPollTimer);
    notificationPollTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        fetchNotifications();
      }
    }, 60000);
  }

  function handleMessage(data: string): void {
    let msg: HAWebSocketMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'auth_required':
        // Send authentication
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'auth', access_token: haToken }));
        }
        break;

      case 'auth_ok':
        sdk.log.info('Authenticated with Home Assistant');
        reconnectDelay = 1000;
        sdk.emit('home-assistant:connection_status', { connected: true });

        // Fetch full entity list
        sendMessageWithCallback(
          { type: 'get_states' },
          (response) => {
            if (response.success && Array.isArray(response.result)) {
              cachedEntities = response.result as HAEntity[];
              sdk.log.info(`Cached ${cachedEntities.length} entities`);
              subscribeToEntities();
              subscribeToNotifications();
            }
          },
        );
        break;

      case 'auth_invalid':
        sdk.log.error('Authentication failed: invalid token');
        sdk.emit('home-assistant:connection_status', { connected: false });
        break;

      case 'result':
        if (msg.id && pendingCallbacks.has(msg.id)) {
          const callback = pendingCallbacks.get(msg.id)!;
          pendingCallbacks.delete(msg.id);
          callback(msg);
        }
        break;

      case 'event':
        handleEvent(msg);
        break;
    }
  }

  function handleEvent(msg: HAWebSocketMessage): void {
    if (!msg.event) return;

    const hasEventType = !!msg.event.event_type;
    const hasTrigger = !!msg.event.variables?.trigger?.to_state;
    sdk.log.info(`HA event: type=${msg.event.event_type || 'none'} hasTrigger=${hasTrigger} keys=${Object.keys(msg.event).join(',')}`);

    // Handle state change triggers
    if (msg.event.variables?.trigger?.to_state) {
      const toState = msg.event.variables.trigger.to_state;
      sdk.log.info(`State trigger received: ${toState.entity_id} → ${toState.state} (watched: ${watchedEntities.has(toState.entity_id)}, watchedCount: ${watchedEntities.size})`);
      // Safety net: only emit for watched entities
      if (watchedEntities.has(toState.entity_id)) {
        const payload = {
          entity_id: toState.entity_id,
          state: toState.state,
          attributes: toState.attributes,
          last_changed: toState.last_changed,
        };
        sdk.emit('home-assistant:state_changed', payload);
        sdk.emit(`home-assistant:state_changed:${toState.entity_id}`, payload);

        // Update cache
        const idx = cachedEntities.findIndex((e) => e.entity_id === toState.entity_id);
        if (idx !== -1) {
          cachedEntities[idx] = toState;
        }
      }
    }

    // Handle persistent notification updates — re-fetch full list on any change
    if (msg.event.event_type === 'persistent_notifications_updated') {
      fetchNotifications();
    }
  }

  function connect(): void {
    if (stopped) return;

    try {
      const wsUrl = getWsUrl();
      sdk.log.info(`Connecting to ${wsUrl}`);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        sdk.log.info('WebSocket connection opened');
      };

      ws.onmessage = (event) => {
        handleMessage(typeof event.data === 'string' ? event.data : String(event.data));
      };

      ws.onclose = () => {
        sdk.log.warn('WebSocket connection closed');
        sdk.emit('home-assistant:connection_status', { connected: false });
        pendingCallbacks.clear();
        scheduleReconnect();
      };

      ws.onerror = (error) => {
        sdk.log.error(`WebSocket error: ${error}`);
      };
    } catch (err) {
      sdk.log.error(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
      scheduleReconnect();
    }
  }

  function scheduleReconnect(): void {
    if (stopped) return;

    sdk.log.info(`Reconnecting in ${reconnectDelay}ms`);
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      connect();
    }, reconnectDelay);
  }

  // Cached activity trail result
  let cachedActivityTrail: { entityId: string; activations: { timestamp: number }[] }[] = [];

  function collectMotionSensorIds(): string[] {
    const widgetConfigs = sdk.getWidgetConfigs() as Array<Record<string, unknown>>;

    const ids = new Set<string>();
    function addIfMotion(id: unknown) {
      if (typeof id === 'string' && id.startsWith('binary_sensor.')) ids.add(id);
    }

    for (const wc of widgetConfigs) {
      addIfMotion(wc.entity_id);
      addIfMotion(wc.entityId);
      if (Array.isArray(wc.entities)) wc.entities.forEach(addIfMotion);

      // Minimap: presence entities from room zones + entity pins
      if (Array.isArray(wc.floors)) {
        for (const floor of wc.floors as Array<Record<string, unknown>>) {
          if (Array.isArray(floor.entities)) {
            for (const pin of floor.entities as Array<Record<string, unknown>>) {
              addIfMotion(pin.entityId);
            }
          }
          if (Array.isArray(floor.roomZones)) {
            for (const zone of floor.roomZones as Array<Record<string, unknown>>) {
              if (Array.isArray(zone.presenceEntities)) {
                (zone.presenceEntities as string[]).forEach(addIfMotion);
              }
            }
          }
        }
      }
    }
    return Array.from(ids);
  }

  async function fetchActivityTrail(): Promise<void> {
    const motionIds = collectMotionSensorIds();
    if (motionIds.length === 0) {
      sdk.log.info('No binary_sensor entities configured — skipping activity trail fetch');
      return;
    }

    const config = sdk.getConfig();
    const durationMinutes = typeof config.activity_trail_minutes === 'number'
      ? config.activity_trail_minutes
      : 15;

    const startTime = new Date(Date.now() - durationMinutes * 60 * 1000).toISOString();
    const filterParam = motionIds.join(',');
    const url = `${haUrl.replace(/\/$/, '')}/api/history/period/${encodeURIComponent(startTime)}?filter_entity_id=${encodeURIComponent(filterParam)}&minimal_response`;

    let result: unknown;
    try {
      result = await sdk.http.get(url, {
        headers: {
          Authorization: `Bearer ${haToken}`,
        },
      });
    } catch (err) {
      sdk.log.error(`Activity trail fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (!Array.isArray(result)) {
      sdk.log.warn('Unexpected response format from HA history API');
      return;
    }

    const trail: { entityId: string; activations: { timestamp: number }[] }[] = [];
    for (const entityHistory of result as Array<Array<{ entity_id?: string; last_changed?: string; state?: string }>> ) {
      if (!Array.isArray(entityHistory) || entityHistory.length === 0) continue;
      const entityId = entityHistory[0].entity_id;
      if (!entityId) continue;

      const activations = entityHistory
        .filter((entry) => entry.state === 'on' && entry.last_changed)
        .map((entry) => ({ timestamp: new Date(entry.last_changed!).getTime() }));

      trail.push({ entityId, activations });
    }

    cachedActivityTrail = trail;
    sdk.emit('home-assistant:activity-trail', { trail });
    sdk.log.info(`Activity trail updated: ${trail.length} entities, ${trail.reduce((sum, e) => sum + e.activations.length, 0)} total activations`);
  }

  // Schedule activity trail polling every 60 seconds
  sdk.schedule(60000, fetchActivityTrail);

  // Register the entities endpoint handler
  sdk.storage.set('__entities_handler__', true);

  // Start connection
  connect();

  return {
    stop() {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (notificationPollTimer) {
        clearInterval(notificationPollTimer);
        notificationPollTimer = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
      pendingCallbacks.clear();
    },

    // Exposed for the entities endpoint
    getEntities(): { domains: Array<{ domain: string; entities: Array<{ entity_id: string; state: string; friendly_name: string }> }> } {
      const domainMap = new Map<string, Array<{ entity_id: string; state: string; friendly_name: string }>>();

      for (const entity of cachedEntities) {
        const domain = entity.entity_id.split('.')[0];
        if (!domainMap.has(domain)) {
          domainMap.set(domain, []);
        }
        domainMap.get(domain)!.push({
          entity_id: entity.entity_id,
          state: entity.state,
          friendly_name: (entity.attributes.friendly_name as string) || entity.entity_id,
        });
      }

      // Sort domains alphabetically, entities by friendly_name within domain
      const domains = Array.from(domainMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([domain, entities]) => ({
          domain,
          entities: entities.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name)),
        }));

      return { domains };
    },

    recalculateWatched(): void {
      subscribeToEntities();
    },

    getActivityTrail(): { entityId: string; activations: { timestamp: number }[] }[] {
      return cachedActivityTrail;
    },
  };
}
