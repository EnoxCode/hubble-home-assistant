import { vi } from 'vitest';
import React from 'react';

// Create mock components that render their props so tests can query rendered content
const mockComponent = (name: string, renderFn?: (props: Record<string, unknown>) => React.ReactElement | null) => {
  const component = vi.fn((props: Record<string, unknown>) => {
    if (renderFn) return renderFn(props);
    return React.createElement('div', { 'data-testid': name }, props.children as React.ReactNode);
  });
  Object.defineProperty(component, 'name', { value: name });
  return component;
};

export const Button = mockComponent('Button', (props) =>
  React.createElement('button', { onClick: props.onClick, type: props.type || 'button' }, props.children));

export const IconButton = mockComponent('IconButton', (props) =>
  React.createElement('button', { onClick: props.onClick, 'aria-label': props.label }, props.children));

export const Input = mockComponent('Input', (props) =>
  React.createElement('input', {
    value: props.value,
    placeholder: props.placeholder,
    onChange: props.onChange ? (e: React.ChangeEvent<HTMLInputElement>) => (props.onChange as (v: string) => void)(e.target.value) : undefined,
    type: props.type || 'text',
  }));

export const Select = mockComponent('Select', (props) => {
  const options = (props.options || []) as Array<{ label: string; value: string }>;
  return React.createElement('div', { 'data-testid': 'Select' },
    React.createElement('span', null, props.label),
    options.length > 0 && React.createElement('select', {
      value: props.value,
      onChange: props.onChange ? (e: React.ChangeEvent<HTMLSelectElement>) => (props.onChange as (v: string) => void)(e.target.value) : undefined,
    }, options.map((o: { label: string; value: string }) =>
      React.createElement('option', { key: o.value, value: o.value }, o.label))),
    props.children);
});

export const Slider = mockComponent('Slider', (props) =>
  React.createElement('input', { type: 'range', value: props.value, min: props.min, max: props.max, step: props.step, onChange: props.onChange }));

export const Toggle = mockComponent('Toggle', (props) =>
  React.createElement('label', null,
    React.createElement('input', { type: 'checkbox', checked: props.checked, onChange: props.onChange }),
    props.label));

export const ColorPicker = mockComponent('ColorPicker', (props) =>
  React.createElement('input', { type: 'color', value: props.value, onChange: props.onChange, 'data-testid': 'ColorPicker' }));

export const StatusDot = mockComponent('StatusDot', (props) =>
  React.createElement('span', { 'data-testid': 'StatusDot', 'data-status': props.status }));

export const Badge = mockComponent('Badge', (props) =>
  React.createElement('span', { 'data-testid': 'Badge' }, props.children));

export const Field = mockComponent('Field', (props) =>
  React.createElement('div', { 'data-testid': 'Field' },
    props.label && React.createElement('label', null, props.label),
    props.children));

export const Collapsible = mockComponent('Collapsible', (props) =>
  React.createElement('div', { 'data-testid': 'Collapsible' },
    props.title && React.createElement('div', null, props.title),
    props.children));
