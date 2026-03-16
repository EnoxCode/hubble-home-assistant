import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DomainGroup } from './types';
import './entity-picker.css';

export interface EntityPickerProps {
  moduleId: number;
  selectedEntityId?: string;
  onSelect: (entityId: string) => void;
  onClose: () => void;
}

type FetchState = 'loading' | 'error' | 'ready';

export function EntityPicker({ moduleId, selectedEntityId, onSelect, onClose }: EntityPickerProps) {
  const [domains, setDomains] = useState<DomainGroup[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [search, setSearch] = useState('');
  const [activeDomain, setActiveDomain] = useState<string>('all');


  const loadEntities = () => {
    setFetchState('loading');
    fetch(`/api/modules/${moduleId}/entities`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data: { domains: DomainGroup[] }) => {
        setDomains(data.domains);
        setFetchState('ready');
      })
      .catch(() => setFetchState('error'));
  };

  useEffect(() => {
    loadEntities();
  }, [moduleId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const q = search.toLowerCase();
  const filteredDomains = domains
    .filter((d) => activeDomain === 'all' || d.domain === activeDomain)
    .map((d) => ({
      ...d,
      entities: d.entities.filter(
        (e) =>
          e.friendly_name.toLowerCase().includes(q) ||
          e.entity_id.toLowerCase().includes(q),
      ),
    }))
    .filter((d) => d.entities.length > 0);

  const hasResults = filteredDomains.some((d) => d.entities.length > 0);

  return createPortal(
    <div className="entity-picker-backdrop" data-testid="entity-picker-backdrop" onClick={onClose}>
      <div className="entity-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="entity-picker-header">
          <p className="entity-picker-title">Pick an entity</p>
          <input
            autoFocus
            className="entity-picker-search"
            placeholder="Search by name or entity ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {fetchState === 'ready' && (
          <div className="entity-picker-domains">
            <button
              className={`entity-picker-domain-chip${activeDomain === 'all' ? ' entity-picker-domain-chip--active' : ''}`}
              onClick={() => setActiveDomain('all')}
            >
              All
            </button>
            {domains.map((d) => (
              <button
                key={d.domain}
                className={`entity-picker-domain-chip${activeDomain === d.domain ? ' entity-picker-domain-chip--active' : ''}`}
                onClick={() => setActiveDomain(d.domain)}
              >
                {d.domain}
              </button>
            ))}
          </div>
        )}

        <div className="entity-picker-list">
          {fetchState === 'loading' && (
            <div className="entity-picker-status" data-testid="entity-picker-loading">
              Loading…
            </div>
          )}

          {fetchState === 'error' && (
            <div className="entity-picker-status">
              <span>Failed to load entities</span>
              <button onClick={loadEntities}>Retry</button>
            </div>
          )}

          {fetchState === 'ready' && !hasResults && (
            <div className="entity-picker-status">No results</div>
          )}

          {fetchState === 'ready' && filteredDomains.map((d) => (
            <div key={d.domain} className="entity-picker-domain-group">
              <p className="entity-picker-domain-label">{d.domain}</p>
              {d.entities.map((e) => (
                <button
                  key={e.entity_id}
                  className={`entity-picker-row${e.entity_id === selectedEntityId ? ' entity-picker-row--selected' : ''}`}
                  onClick={() => onSelect(e.entity_id)}
                >
                  <span className="entity-picker-row-info">
                    <span className="entity-picker-friendly-name">{e.friendly_name}</span>
                    <span className="entity-picker-entity-id">{e.entity_id}</span>
                  </span>
                  <span className="entity-picker-state">{e.state}</span>
                  {e.entity_id === selectedEntityId && (
                    <span className="entity-picker-check" data-testid={`entity-selected-${e.entity_id}`}>✓</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
