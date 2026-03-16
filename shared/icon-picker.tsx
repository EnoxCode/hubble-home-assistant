import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Icon from '@mdi/react';
import * as mdiIcons from '@mdi/js';
import { getMdiPath } from './mdi-utils';
import { MDI_CATEGORIES } from './mdi-categories';
import { Button } from 'hubble-ui';
import './icon-picker.css';

// Convert mdiThermometer → "thermometer", mdiLightbulbOff → "lightbulb-off"
const ALL_MDI_NAMES: string[] = Object.keys(mdiIcons)
  .filter(k => k.startsWith('mdi') && k.length > 3 && k !== 'mdiExport')
  .map(k => k.slice(3).replace(/[A-Z]/g, c => '-' + c.toLowerCase()).replace(/^-/, ''));

interface IconPickerProps {
  onSelect: (iconName: string) => void;  // emits "mdi:thermometer"
  selectedIcon?: string;                  // receives "mdi:thermometer"
}

export function IconPicker({ onSelect, selectedIcon }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [pendingIcon, setPendingIcon] = useState<string | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  const displayedIcons = useMemo(() => {
    if (search) {
      return ALL_MDI_NAMES.filter(n => n.includes(search.toLowerCase()));
    } else if (activeCategory === 'All') {
      return ALL_MDI_NAMES.slice(0, 120);
    } else {
      return MDI_CATEGORIES[activeCategory] ?? [];
    }
  }, [search, activeCategory]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPendingIcon(undefined); setOpen(false); } };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const modal = open ? ReactDOM.createPortal(
    <div className="icon-picker__overlay" onClick={() => { setPendingIcon(undefined); setOpen(false); }}>
      <div className="icon-picker__modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="icon-picker__header">
          <span className="icon-picker__title">Choose Icon</span>
          <button type="button" className="icon-picker__close" onClick={() => setOpen(false)}>×</button>
        </div>
        {/* Search */}
        <div className="icon-picker__search-wrap">
          <input
            ref={searchRef}
            type="text"
            className="icon-picker__search"
            placeholder="Search 7,000+ icons…"
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory('All'); }}
          />
        </div>
        {/* Body */}
        <div className="icon-picker__body">
          {/* Sidebar */}
          <div className="icon-picker__sidebar">
            <div
              className={`icon-picker__sidebar-item${activeCategory === 'All' ? ' icon-picker__sidebar-item--active' : ''}`}
              onClick={() => { setActiveCategory('All'); setSearch(''); }}
            >
              All <span className="icon-picker__sidebar-count">{ALL_MDI_NAMES.length}+</span>
            </div>
            {Object.entries(MDI_CATEGORIES).map(([cat, icons]) => (
              <div
                key={cat}
                className={`icon-picker__sidebar-item${activeCategory === cat ? ' icon-picker__sidebar-item--active' : ''}`}
                onClick={() => { setActiveCategory(cat); setSearch(''); }}
              >
                {cat} <span className="icon-picker__sidebar-count">{icons.length}</span>
              </div>
            ))}
          </div>
          {/* Grid */}
          <div className="icon-picker__grid-wrap">
            {displayedIcons.length === 0 ? (
              <div className="icon-picker__no-results">No icons found</div>
            ) : (
              <div className="icon-picker__grid">
                {displayedIcons.map(name => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    className={`icon-picker__icon-btn${pendingIcon === 'mdi:' + name ? ' icon-picker__icon-btn--selected' : ''}`}
                    onClick={() => setPendingIcon('mdi:' + name)}
                  >
                    <Icon path={getMdiPath('mdi:' + name)} size="20px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="icon-picker__footer">
          <div className="icon-picker__selected-preview">
            {pendingIcon ? (
              <>
                <div className="icon-picker__preview-box">
                  <Icon path={getMdiPath(pendingIcon)} size="16px" />
                </div>
                <div>
                  <div className="icon-picker__preview-name">{pendingIcon.replace('mdi:', '')}</div>
                  <div className="icon-picker__preview-mdi">{pendingIcon}</div>
                </div>
              </>
            ) : (
              <span className="icon-picker__preview-empty">No icon selected</span>
            )}
          </div>
          <div className="icon-picker__footer-actions">
            <Button variant="ghost" size="sm" onClick={() => { setPendingIcon(undefined); setOpen(false); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => { if (pendingIcon) { onSelect(pendingIcon); } setOpen(false); }}>Select</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="icon-picker">
      <button className="icon-picker__trigger" type="button" onClick={() => { setPendingIcon(selectedIcon); setOpen(true); }}>
        <span className="icon-picker__trigger-left">
          {selectedIcon ? (
            <>
              <Icon path={getMdiPath(selectedIcon)} size="18px" className="icon-picker__trigger-icon" />
              <span className="icon-picker__trigger-name">{selectedIcon.replace('mdi:', '')}</span>
            </>
          ) : (
            <span className="icon-picker__placeholder">Select icon…</span>
          )}
        </span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="icon-picker__chevron">
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {modal}
    </div>
  );
}
