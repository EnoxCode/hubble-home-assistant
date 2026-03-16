// HubbleHomeAssistant Visualization
import React, { useEffect, useState } from 'react';
import { useConnectorData, useWidgetConfig } from '@hubble/sdk';
// import { DashWidget, DashWidgetHeader, DashWidgetFooter, DashBadge, DashPill, DashSkeleton } from 'hubble-dash-ui';
// import 'hubble-dash-ui/styles/dash-base.css';
// import { Badge, Field } from 'hubble-ui'; // For config panels only: Button, IconButton, Input, Select, Slider, Toggle, ColorPicker, StatusDot, Badge, Field, Collapsible
import './style.css';

interface HubbleHomeAssistantData {
  message: string;
}

const HubbleHomeAssistantViz = () => {
  const data = useConnectorData<HubbleHomeAssistantData>();
  const config = useWidgetConfig<{ title?: string }>();

  if (!data) {
    return <div className="hubble-home-assistant-loading">Waiting for data...</div>;
  }

  return (
    <div className="hubble-home-assistant-container">
      {config.title && <h3 className="hubble-home-assistant-title">{config.title}</h3>}
      <p>{data.message}</p>
    </div>
  );
};

export default HubbleHomeAssistantViz;
