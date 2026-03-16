import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import homeAssistantConnector from './index';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  sentMessages: string[] = [];

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Test helpers
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateOpen() {
    this.onopen?.();
  }
}

let lastWs: MockWebSocket;

function createMockSdk() {
  return {
    getConfig: vi.fn(() => ({
      ha_url: 'http://homeassistant.local:8123',
      ha_token: 'test-token-123',
    })),
    emit: vi.fn(),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    logError: vi.fn(),
    storage: {
      get: vi.fn(() => null),
      set: vi.fn(),
      delete: vi.fn(),
      collection: vi.fn(),
    },
    schedule: vi.fn(() => ({ stop: vi.fn() })),
    http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    oauth: { isAuthorized: vi.fn(), getAccessToken: vi.fn(), getTokens: vi.fn() },
    getConnectorState: vi.fn(),
    getDashboardState: vi.fn(),
    notify: vi.fn(),
    getWidgetConfigs: vi.fn(() => []),
  };
}

describe('Home Assistant Connector', () => {
  let sdk: ReturnType<typeof createMockSdk>;

  beforeEach(() => {
    vi.useFakeTimers();
    sdk = createMockSdk();

    vi.stubGlobal('WebSocket', class extends MockWebSocket {
      constructor() {
        super();
        lastWs = this;
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects to HA WebSocket using ha_url from config', () => {
    homeAssistantConnector(sdk as any);
    expect(lastWs).toBeDefined();
  });

  it('authenticates with ha_token', () => {
    homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_required' });

    const authMsg = JSON.parse(lastWs.sentMessages[0]);
    expect(authMsg.type).toBe('auth');
    expect(authMsg.access_token).toBe('test-token-123');
  });

  it('emits connection_status: { connected: true } on successful auth', () => {
    homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_ok' });

    expect(sdk.emit).toHaveBeenCalledWith('home-assistant:connection_status', { connected: true });
  });

  it('emits connection_status: { connected: false } on disconnect', () => {
    const result = homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_ok' });
    sdk.emit.mockClear();

    lastWs.close();

    expect(sdk.emit).toHaveBeenCalledWith('home-assistant:connection_status', { connected: false });
    result?.stop();
  });

  it('auto-reconnects with exponential backoff on disconnect', () => {
    const result = homeAssistantConnector(sdk as any);
    const firstWs = lastWs;

    firstWs.close();

    // Should schedule reconnect
    vi.advanceTimersByTime(1000);

    // A new WebSocket should be created
    expect(lastWs).not.toBe(firstWs);
    result?.stop();
  });

  it('fetches initial entity list via get_states on startup', () => {
    homeAssistantConnector(sdk as any);

    // Simulate auth
    lastWs.simulateMessage({ type: 'auth_ok' });

    // Should have sent get_states
    const messages = lastWs.sentMessages.map((m) => JSON.parse(m));
    expect(messages.some((m: { type: string }) => m.type === 'get_states')).toBe(true);
  });

  it('emits state_changed for watched entities from cached get_states', () => {
    sdk.getWidgetConfigs.mockReturnValue([{ entity_id: 'light.living' }]);

    homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_ok' });

    // Find get_states message id
    const messages = lastWs.sentMessages.map((m) => JSON.parse(m));
    const getStatesMsg = messages.find((m: { type: string }) => m.type === 'get_states');

    // Simulate response
    lastWs.simulateMessage({
      type: 'result',
      id: getStatesMsg.id,
      success: true,
      result: [
        { entity_id: 'light.living', state: 'on', attributes: { friendly_name: 'Living Room' }, last_changed: '2026-01-01T00:00:00' },
        { entity_id: 'light.bedroom', state: 'off', attributes: { friendly_name: 'Bedroom' }, last_changed: '2026-01-01T00:00:00' },
      ],
    });

    // Should emit state_changed for the watched entity
    expect(sdk.emit).toHaveBeenCalledWith('home-assistant:state_changed', expect.objectContaining({ entity_id: 'light.living' }));
  });

  it('does NOT emit state changes for unwatched entities', () => {
    sdk.storage.get.mockReturnValue([{ entity_id: 'light.living' }]);

    homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_ok' });

    const messages = lastWs.sentMessages.map((m) => JSON.parse(m));
    const getStatesMsg = messages.find((m: { type: string }) => m.type === 'get_states');

    lastWs.simulateMessage({
      type: 'result',
      id: getStatesMsg.id,
      success: true,
      result: [
        { entity_id: 'light.living', state: 'on', attributes: {}, last_changed: '2026-01-01' },
        { entity_id: 'light.unwatched', state: 'on', attributes: {}, last_changed: '2026-01-01' },
      ],
    });

    const emittedEntities = sdk.emit.mock.calls
      .filter((c: unknown[]) => c[0] === 'home-assistant:state_changed')
      .map((c: unknown[]) => (c[1] as { entity_id: string }).entity_id);

    expect(emittedEntities).not.toContain('light.unwatched');
  });

  it('subscribes to persistent_notifications_updated events', () => {
    homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_ok' });

    // Simulate get_states response to trigger subscribeToNotifications
    const messages = lastWs.sentMessages.map((m) => JSON.parse(m));
    const getStatesMsg = messages.find((m: { type: string }) => m.type === 'get_states');

    lastWs.simulateMessage({
      type: 'result',
      id: getStatesMsg.id,
      success: true,
      result: [],
    });

    const allMessages = lastWs.sentMessages.map((m) => JSON.parse(m));
    expect(
      allMessages.some((m: { type: string; event_type?: string }) => m.type === 'subscribe_events' && m.event_type === 'persistent_notifications_updated'),
    ).toBe(true);
  });

  it('collects entity IDs from list widget entities[] config', () => {
    sdk.getWidgetConfigs.mockReturnValue([
      { entities: ['lock.front_door', 'lock.back_door'] },
    ]);

    const result = homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_ok' });

    const messages = lastWs.sentMessages.map((m) => JSON.parse(m));
    const getStatesMsg = messages.find((m: { type: string }) => m.type === 'get_states');

    lastWs.simulateMessage({
      type: 'result',
      id: getStatesMsg.id,
      success: true,
      result: [
        { entity_id: 'lock.front_door', state: 'locked', attributes: { friendly_name: 'Front Door' }, last_changed: '2026-01-01' },
        { entity_id: 'lock.back_door', state: 'unlocked', attributes: { friendly_name: 'Back Door' }, last_changed: '2026-01-01' },
      ],
    });

    expect(sdk.emit).toHaveBeenCalledWith('home-assistant:state_changed', expect.objectContaining({ entity_id: 'lock.front_door' }));
    expect(sdk.emit).toHaveBeenCalledWith('home-assistant:state_changed', expect.objectContaining({ entity_id: 'lock.back_door' }));

    result?.stop();
  });

  it('getEntities returns cached entity list grouped by domain', () => {
    sdk.storage.get.mockReturnValue(null);

    const result = homeAssistantConnector(sdk as any);
    lastWs.simulateMessage({ type: 'auth_ok' });

    const messages = lastWs.sentMessages.map((m) => JSON.parse(m));
    const getStatesMsg = messages.find((m: { type: string }) => m.type === 'get_states');

    lastWs.simulateMessage({
      type: 'result',
      id: getStatesMsg.id,
      success: true,
      result: [
        { entity_id: 'light.living', state: 'on', attributes: { friendly_name: 'Living Room' }, last_changed: '2026-01-01' },
        { entity_id: 'sensor.temp', state: '22', attributes: { friendly_name: 'Temperature' }, last_changed: '2026-01-01' },
        { entity_id: 'light.bedroom', state: 'off', attributes: { friendly_name: 'Bedroom' }, last_changed: '2026-01-01' },
      ],
    });

    const entities = result?.getEntities();
    expect(entities?.domains).toHaveLength(2);
    // Domains sorted alphabetically
    expect(entities?.domains[0].domain).toBe('light');
    expect(entities?.domains[1].domain).toBe('sensor');
    // Entities sorted by friendly_name within domain
    expect(entities?.domains[0].entities[0].friendly_name).toBe('Bedroom');
    expect(entities?.domains[0].entities[1].friendly_name).toBe('Living Room');

    result?.stop();
  });
});
