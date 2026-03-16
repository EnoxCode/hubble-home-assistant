import React, { useState, useEffect, useMemo } from 'react';
import { useConnectorData, useWidgetConfig } from 'hubble-sdk';
import { DashWidget, DashWidgetHeader, DashWidgetFooter } from 'hubble-dash-ui';
import Icon from '@mdi/react';
import { getMdiPath } from '../../shared/mdi-utils';
import type { NotificationConfig, HANotification } from '../../shared/types';
import { evaluateConditions } from '../../shared/types';
import { format as timeago } from 'timeago.js';
import { worstStatus } from '../../shared/state-utils';
import { parseNotification } from '../../shared/notification-parser';
import type { ParsedNotification } from '../../shared/notification-parser';
import './notifications.css';

function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  const segments = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);
  for (const seg of segments) {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      parts.push(<strong key={key++}>{seg.slice(2, -2)}</strong>);
    } else if (seg.startsWith('*') && seg.endsWith('*')) {
      parts.push(<em key={key++}>{seg.slice(1, -1)}</em>);
    } else if (seg.startsWith('`') && seg.endsWith('`')) {
      parts.push(<code key={key++} className="ha-notif-code">{seg.slice(1, -1)}</code>);
    } else {
      const linkMatch = seg.match(/^\[(.+?)\]\((.+?)\)$/);
      if (linkMatch) {
        parts.push(linkMatch[1]);
      } else {
        parts.push(seg);
      }
    }
  }
  return parts;
}

function MdiIcon({ name, size = 16 }: { name: string; size?: number }) {
  const path = getMdiPath(name);
  if (!path) return null;
  return <Icon path={path} size={`${size}px`} />;
}

interface NotificationsPayload {
  notifications: HANotification[];
}

interface StateChangePayload {
  entity_id: string;
  state: string;
}

const SEVERITY_HEX: Record<string, string> = {
  critical: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
};

function NotifCard({ parsed }: { parsed: ParsedNotification }) {
  const isStandard = parsed.type === 'standard';
  const hasIcon = !!parsed.icon;

  const cardClasses = [
    'ha-notif',
    `ha-notif--${parsed.severity}`,
    isStandard && 'ha-notif--standard',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {hasIcon && (
        <div className={`ha-notif-icon ha-notif-icon--${parsed.severity}`}>
          <MdiIcon name={parsed.icon!} size={16} />
        </div>
      )}
      <div className="ha-notif-content">
        {parsed.type === 'appliance' && parsed.status ? (
          <div className="ha-notif-title-row">
            <div className="ha-notif-title">{parsed.title}</div>
            <div className={`ha-notif-status ha-notif-status--${parsed.status}`}>
              {parsed.status}
            </div>
          </div>
        ) : (
          parsed.title && <div className="ha-notif-title">{parsed.title}</div>
        )}

        {parsed.type === 'summary' && parsed.summaryRows ? (
          <div className="ha-notif-summary">
            {parsed.summaryRows.map((row, i) => (
              <div key={i} className="ha-notif-summary-row">
                <span className="ha-notif-summary-label">
                  <span className="ha-notif-summary-icon">
                    <MdiIcon name={row.icon} size={12} />
                  </span>
                  {row.label}
                </span>
                <span className="ha-notif-summary-value">{row.value}</span>
              </div>
            ))}
          </div>
        ) : (
          parsed.body && <div className="ha-notif-text">{renderMarkdown(parsed.body)}</div>
        )}

        {parsed.type === 'alert' && parsed.source && (
          <div className="ha-notif-source">
            <span className="ha-notif-source-dot" style={{ background: `var(--dash-state-${parsed.severity})` }} />
            {parsed.source}
          </div>
        )}

        {parsed.type === 'maintenance' && (
          <div className="ha-notif-action">
            <MdiIcon name="mdi:wrench" size={10} />
            Action needed
          </div>
        )}

        <div className="ha-notif-time">
          {parsed.footerNote || timeago(parsed.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsWidget() {
  const config = useWidgetConfig<NotificationConfig>();
  const notifData = useConnectorData<NotificationsPayload>('home-assistant', 'home-assistant:notifications');
  const stateData = useConnectorData<StateChangePayload>('home-assistant', 'home-assistant:state_changed');
  const [entityStates, setEntityStates] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (stateData) {
      setEntityStates((prev) => {
        const next = new Map(prev);
        next.set(stateData.entity_id, stateData.state);
        return next;
      });
    }
  }, [stateData]);

  const visible = useMemo(() => {
    return evaluateConditions(config.visibilityConditions, entityStates);
  }, [config.visibilityConditions, entityStates]);

  if (!visible) return null;

  const maxVisible = config.maxVisible ?? config.maxNotifications ?? 5;
  const notifications = notifData?.notifications
    ? [...notifData.notifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, maxVisible)
    : [];

  const parsed = notifications.map(parseNotification);
  const severityHexes = parsed.map((p) => SEVERITY_HEX[p.severity] || '');
  const dotStatus = worstStatus(severityHexes);
  const countText = notifications.length > 0 ? `${notifications.length} active` : undefined;

  return (
    <DashWidget>
      <DashWidgetHeader label="Notifications" meta={countText} />
      <div className="ha-notif-stack">
        {parsed.map((p, idx) => (
          <NotifCard key={notifications[idx].notification_id} parsed={p} />
        ))}
      </div>
      <DashWidgetFooter label="From Home Assistant" status={dotStatus} />
    </DashWidget>
  );
}
