import { describe, it, expect } from 'vitest';
import { parseNotification } from './notification-parser';

describe('parseNotification', () => {
  describe('notification_id parsing', () => {
    it('parses hubble:type:severity:source format', () => {
      const result = parseNotification({
        notification_id: 'hubble:alert:warning:front_door',
        title: 'Front Door Open', message: 'Has been open for 10 minutes.',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.type).toBe('alert');
      expect(result.severity).toBe('warning');
      expect(result.source).toBe('front_door');
    });

    it('falls back to standard type for non-hubble notifications', () => {
      const result = parseNotification({
        notification_id: 'random_hash_123', title: 'Something', message: 'Plain message',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.type).toBe('standard');
    });

    it('uses keyword severity detection for standard type', () => {
      const result = parseNotification({
        notification_id: 'some_id', title: 'Alarm triggered', message: 'Details',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.type).toBe('standard');
      expect(result.severity).toBe('critical');
    });
  });

  describe('icon marker extraction', () => {
    it('extracts icon from <!-- icon:mdi:... --> and strips from body', () => {
      const result = parseNotification({
        notification_id: 'hubble:alert:critical:water_leak', title: 'Water Leak',
        message: '<!-- icon:mdi:water-alert -->Basement sensor triggered.',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.icon).toBe('mdi:water-alert');
      expect(result.body).toBe('Basement sensor triggered.');
    });

    it('returns no icon when marker is absent', () => {
      const result = parseNotification({
        notification_id: 'hubble:system:critical:nas', title: 'NAS Down',
        message: 'Not responding.', created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.icon).toBeUndefined();
    });
  });

  describe('status marker extraction', () => {
    it('extracts status:done', () => {
      const result = parseNotification({
        notification_id: 'hubble:appliance:info:washer', title: 'Washer',
        message: '<!-- icon:mdi:washing-machine --><!-- status:done -->Cycle completed.',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.status).toBe('done');
      expect(result.body).toBe('Cycle completed.');
    });

    it('extracts status:error', () => {
      const result = parseNotification({
        notification_id: 'hubble:appliance:critical:printer', title: 'Printer',
        message: '<!-- icon:mdi:printer-3d --><!-- status:error -->Print failed.',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.status).toBe('error');
    });
  });

  describe('summary row parsing', () => {
    it('parses pipe-separated rows for summary type', () => {
      const result = parseNotification({
        notification_id: 'hubble:summary:neutral:away', title: 'Away',
        message: '<!-- icon:mdi:home-clock -->\nmdi:doorbell | Doorbell | 3\nmdi:robot-vacuum | Vacuum | Cleaned\n---\nAway for 6 hours',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.summaryRows).toHaveLength(2);
      expect(result.summaryRows![0]).toEqual({ icon: 'mdi:doorbell', label: 'Doorbell', value: '3' });
      expect(result.footerNote).toBe('Away for 6 hours');
      expect(result.body).toBe('');
    });

    it('parses folded YAML (spaces instead of newlines)', () => {
      const result = parseNotification({
        notification_id: 'hubble:summary:neutral:away_recap',
        title: 'While You Were Away',
        message: '<!-- icon:mdi:home-clock --> mdi:doorbell | Doorbell rings | 3 mdi:robot-vacuum | Vacuum | Cleaned mdi:lightning-bolt | Power usage | 4.2 kWh mdi:package-variant | Deliveries | 1 package --- You were away for 6 hours',
        created_at: '2026-03-16T00:10:03.867260+00:00',
      });
      expect(result.icon).toBe('mdi:home-clock');
      expect(result.summaryRows).toHaveLength(4);
      expect(result.summaryRows![0]).toEqual({ icon: 'mdi:doorbell', label: 'Doorbell rings', value: '3' });
      expect(result.summaryRows![1]).toEqual({ icon: 'mdi:robot-vacuum', label: 'Vacuum', value: 'Cleaned' });
      expect(result.summaryRows![2]).toEqual({ icon: 'mdi:lightning-bolt', label: 'Power usage', value: '4.2 kWh' });
      expect(result.summaryRows![3]).toEqual({ icon: 'mdi:package-variant', label: 'Deliveries', value: '1 package' });
      expect(result.footerNote).toBe('You were away for 6 hours');
    });

    it('handles summary without footer', () => {
      const result = parseNotification({
        notification_id: 'hubble:summary:neutral:stats', title: 'Stats',
        message: 'mdi:lightning-bolt | Power | 4.2 kWh', created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.summaryRows).toHaveLength(1);
      expect(result.footerNote).toBeUndefined();
    });
  });

  describe('non-summary types', () => {
    it('maintenance keeps body text, no summary rows', () => {
      const result = parseNotification({
        notification_id: 'hubble:maintenance:warning:filter', title: 'Filter',
        message: '<!-- icon:mdi:air-filter -->Running 90 days.',
        created_at: '2026-03-16T10:00:00Z',
      });
      expect(result.body).toBe('Running 90 days.');
      expect(result.summaryRows).toBeUndefined();
    });
  });
});
