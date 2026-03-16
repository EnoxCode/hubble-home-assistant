import { vi } from 'vitest';
import React from 'react';

const mockComponent = (name: string, renderFn?: (props: Record<string, unknown>) => React.ReactElement | null) => {
  const component = vi.fn((props: Record<string, unknown>) => {
    if (renderFn) return renderFn(props);
    return React.createElement('div', { 'data-testid': name }, props.children as React.ReactNode);
  });
  Object.defineProperty(component, 'name', { value: name });
  return component;
};

export const DashWidget = mockComponent('DashWidget', (props) =>
  React.createElement('div', {
    'data-testid': 'DashWidget',
    className: props.className,
    'data-status-border': props.statusBorder,
  }, props.children));

export const DashWidgetHeader = mockComponent('DashWidgetHeader', (props) =>
  React.createElement('div', { 'data-testid': 'DashWidgetHeader' },
    props.label && React.createElement('span', null, props.label),
    props.meta && React.createElement('span', null, props.meta),
    props.children));

export const DashWidgetFooter = mockComponent('DashWidgetFooter', (props) =>
  React.createElement('div', { 'data-testid': 'DashWidgetFooter' },
    props.timestamp && React.createElement('span', null, String(props.timestamp)),
    props.children));

export const DashStatusDot = mockComponent('DashStatusDot', (props) =>
  React.createElement('span', { 'data-testid': 'DashStatusDot', 'data-status': props.status }));

export const DashSkeleton = mockComponent('DashSkeleton', () =>
  React.createElement('div', { 'data-testid': 'DashSkeleton' }));

export const DashDivider = mockComponent('DashDivider', () =>
  React.createElement('hr', { 'data-testid': 'DashDivider' }));

export const DashBadge = mockComponent('DashBadge', (props) =>
  React.createElement('span', { 'data-testid': 'DashBadge', 'data-variant': props.variant }, props.children));

const DashPillBase = mockComponent('DashPill', (props) =>
  React.createElement('div', { 'data-testid': 'DashPill', 'data-variant': props.variant, className: props.className },
    props.icon && React.createElement('span', null, String(props.icon)),
    props.label && React.createElement('span', null, String(props.label)),
    props.children));

const DashPillDot = mockComponent('DashPill.Dot', (props) =>
  React.createElement('span', { 'data-testid': 'DashPillDot', 'data-color': props.color }));

export const DashPill = Object.assign(DashPillBase, { Dot: DashPillDot });

export const DashCarouselDots = mockComponent('DashCarouselDots', (props) =>
  React.createElement('div', { 'data-testid': 'DashCarouselDots' }));

export const DashThumbnail = mockComponent('DashThumbnail', (props) =>
  React.createElement('div', { 'data-testid': 'DashThumbnail' }, props.children));
