import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mockConnectorData: Record<string, unknown> = {};
let mockConfig: Record<string, unknown> = {};

vi.mock('hubble-sdk', () => ({
  useConnectorData: (_module?: string, topic?: string) => {
    return mockConnectorData[topic || 'default'] || null;
  },
  useWidgetConfig: () => mockConfig,
}));

vi.mock('hubble-dash-ui', () => ({
  DashWidget: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className: `dash-glass dash-widget ${className || ''}`, 'data-testid': 'dash-widget' }, children),
  DashWidgetHeader: ({ label, meta }: { label: string; meta?: string }) =>
    React.createElement('div', { className: 'dash-widget-header', 'data-testid': 'dash-header' },
      React.createElement('span', { className: 't-label' }, label),
      meta && React.createElement('span', { className: 't-meta' }, meta),
    ),
  DashWidgetFooter: ({ label, status }: { label?: string; status?: string }) =>
    React.createElement('div', { className: 'dash-widget-footer', 'data-testid': 'dash-footer' },
      label && React.createElement('span', { className: 't-meta' }, label),
      React.createElement('span', { className: `dash-status-dot dash-status-dot--${status || 'ok'}` }),
    ),
  DashStatusDot: ({ status }: { status: string }) =>
    React.createElement('span', { className: `dash-status-dot dash-status-dot--${status}` }),
}));

vi.mock('@mdi/react', () => ({
  default: ({ path }: { path: string }) =>
    React.createElement('svg', { 'data-testid': 'mdi-icon', 'data-path': path }),
}));

vi.mock('../../shared/mdi-utils', () => ({
  getMdiPath: (n: string) => n ? `path-for-${n}` : '',
}));

vi.mock('timeago.js', () => ({
  format: (date: string) => {
    const diffMs = Date.now() - new Date(date).getTime();
    if (diffMs < 60000) return 'just now';
    return `${Math.floor(diffMs / 60000)} minutes ago`;
  },
}));

import NotificationsWidget from './index';

describe('NotificationsWidget', () => {
  beforeEach(() => {
    mockConfig = { maxVisible: 5 };
    Object.keys(mockConnectorData).forEach((k) => delete mockConnectorData[k]);
  });

  it('renders DashWidget shell with header', () => {
    render(<NotificationsWidget />);
    expect(screen.getByTestId('dash-widget')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows count in header meta', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [
        { notification_id: '1', title: 'Alert', message: 'msg', created_at: new Date().toISOString() },
        { notification_id: '2', title: 'Info', message: 'msg', created_at: new Date().toISOString() },
      ],
    };
    render(<NotificationsWidget />);
    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  it('renders severity card with left border class', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [
        { notification_id: '1', title: 'Alarm bypass active', message: 'Details', created_at: new Date().toISOString() },
      ],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelector('.ha-notif--critical')).toBeTruthy();
  });

  it('renders markdown in message body', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [
        { notification_id: '1', title: 'Test', message: 'This is **bold** text', created_at: new Date().toISOString() },
      ],
    };
    render(<NotificationsWidget />);
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
  });

  it('renders footer with "From Home Assistant" label', () => {
    render(<NotificationsWidget />);
    expect(screen.getByText('From Home Assistant')).toBeInTheDocument();
  });

  it('truncates at maxVisible, no scroll', () => {
    mockConfig = { maxVisible: 2 };
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [
        { notification_id: '1', title: 'First', message: 'msg', created_at: '2026-01-01T03:00:00' },
        { notification_id: '2', title: 'Second', message: 'msg', created_at: '2026-01-01T02:00:00' },
        { notification_id: '3', title: 'Third', message: 'msg', created_at: '2026-01-01T01:00:00' },
      ],
    };
    render(<NotificationsWidget />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.queryByText('Third')).not.toBeInTheDocument();
  });

  it('status dot reflects worst severity', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [
        { notification_id: '1', title: 'Alarm triggered', message: '', created_at: new Date().toISOString() },
        { notification_id: '2', title: 'Normal', message: '', created_at: new Date().toISOString() },
      ],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelector('.dash-status-dot--error')).toBeTruthy();
  });
});

describe('Card type rendering', () => {
  beforeEach(() => {
    mockConfig = { maxVisible: 5 };
    Object.keys(mockConnectorData).forEach((k) => delete mockConnectorData[k]);
  });

  it('renders alert card with icon and source tag', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [{
        notification_id: 'hubble:alert:warning:front_door',
        title: 'Front Door Open',
        message: '<!-- icon:mdi:door-open -->Has been open for 10 minutes.',
        created_at: new Date().toISOString(),
      }],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelector('.ha-notif-icon--warning')).toBeTruthy();
    expect(container.querySelector('.ha-notif-source')).toBeTruthy();
  });

  it('renders appliance card with status badge', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [{
        notification_id: 'hubble:appliance:info:washing_machine',
        title: 'Washing Machine',
        message: '<!-- icon:mdi:washing-machine --><!-- status:done -->Cycle completed.',
        created_at: new Date().toISOString(),
      }],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelector('.ha-notif-icon--info')).toBeTruthy();
    expect(container.querySelector('.ha-notif-status--done')).toBeTruthy();
  });

  it('renders summary card with key-value rows', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [{
        notification_id: 'hubble:summary:neutral:away_recap',
        title: 'While You Were Away',
        message: '<!-- icon:mdi:home-clock -->\nmdi:doorbell | Doorbell | 3\nmdi:robot-vacuum | Vacuum | Done\n---\nAway for 6 hours',
        created_at: new Date().toISOString(),
      }],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelectorAll('.ha-notif-summary-row')).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Away for 6 hours')).toBeInTheDocument();
  });

  it('renders maintenance card with action needed tag', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [{
        notification_id: 'hubble:maintenance:warning:air_filter',
        title: 'Air Filter Due',
        message: '<!-- icon:mdi:air-filter -->Filter running 90 days.',
        created_at: new Date().toISOString(),
      }],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelector('.ha-notif-action')).toBeTruthy();
  });

  it('renders standard card without icon for non-hubble notifications', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [{
        notification_id: 'random_hash',
        title: 'Plain notification',
        message: 'Just a message.',
        created_at: new Date().toISOString(),
      }],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelector('.ha-notif--standard')).toBeTruthy();
    expect(container.querySelector('.ha-notif-icon')).toBeFalsy();
  });

  it('strips icon marker from displayed body text', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [{
        notification_id: 'hubble:system:critical:nas',
        title: 'NAS Down',
        message: '<!-- icon:mdi:server-off -->Not responding.',
        created_at: new Date().toISOString(),
      }],
    };
    render(<NotificationsWidget />);
    expect(screen.getByText('Not responding.')).toBeInTheDocument();
    expect(screen.queryByText(/icon:mdi/)).toBeFalsy();
  });

  it('uses severity from notification_id not keyword detection', () => {
    mockConnectorData['home-assistant:notifications'] = {
      notifications: [{
        notification_id: 'hubble:coordination:info:guest_mode',
        title: 'Guest Mode Active',
        message: 'Cameras in privacy mode.',
        created_at: new Date().toISOString(),
      }],
    };
    const { container } = render(<NotificationsWidget />);
    expect(container.querySelector('.ha-notif--info')).toBeTruthy();
  });
});
