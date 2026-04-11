import React from 'react';
import type { OpenTicketPlugin } from '@openticket/core';

// ----------------------------------------------------------------------------
// 1. Dashboard Widget Component (Server Component)
// ----------------------------------------------------------------------------
const DemoDashboardWidget = async ({ api, config }: any) => {
  let incidentCount = 42;

  // Since this is a Server Component, we can natively await server-side APIs if needed.
  if (api && api.searchOpenIncidents) {
    try {
      const data = await api.searchOpenIncidents({ limit: 10 });
      incidentCount = data?.length || 0;
    } catch {
      incidentCount = 12; // fallback for demo
    }
  }

  return (
    <div style={{
      padding: '1.25rem',
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '24px' }}>🎨</span>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
          Custom Injected Widget
        </h3>
      </div>
      <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem' }}>
        This React component was delivered directly from the standard OpenTicket Plugin Registry zero-downtime hot-loader.
      </p>
      <div style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontWeight: 500, color: '#64748b' }}>Open Incidents Detected</span>
        <span style={{
          padding: '4px 12px',
          backgroundColor: '#3b82f6',
          color: 'white',
          fontWeight: 700,
          borderRadius: '9999px',
          fontSize: '0.875rem'
        }}>
          {incidentCount}
        </span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 2. Settings Panel Component (Server Component)
// ----------------------------------------------------------------------------
const DemoSettingsPanel = ({ config }: any) => {
  const isDemoModeEnabled = config?.ENABLE_DEMO_MODE === 'true';

  return (
    <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
      <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
        ⚙️ UI Injection Settings Panel
      </h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        This panel supports native React UI injections. 
      </p>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <button 
          style={{
            padding: '10px 20px',
            backgroundColor: isDemoModeEnabled ? '#10b981' : '#f1f5f9',
            color: isDemoModeEnabled ? '#ffffff' : '#475569',
            border: `1px solid ${isDemoModeEnabled ? '#059669' : '#cbd5e1'}`,
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'not-allowed',
            opacity: 0.8
          }}
          disabled
        >
          {isDemoModeEnabled ? 'Demo Config Active' : 'Demo Config Inactive'}
        </button>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
          This button's appearance is driven directly by your Plugin Config JSON instead of useState.
        </span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Plugin Registration Manifest
// ----------------------------------------------------------------------------
const UiInjectionDemo: OpenTicketPlugin = {
  manifest: {
    id: 'ui-injection-demo',
    name: 'UI Frontend Injection Demo',
    version: '1.0.0',
    description: 'Demonstrates the Zero-Downtime Hot Reload capabilities of OpenTicket by natively injecting React widgets and settings panels into the dashboard.',
    requestedPermissions: ['VIEW_INCIDENTS_ALL']
  },
  
  // Registering our custom frontend components!
  ui: {
    dashboardWidgets: [DemoDashboardWidget],
    settingsPanels: [DemoSettingsPanel]
  },

  // No specific background hooks needed for this cosmetic plugin demo
  hooks: {}
};

export default UiInjectionDemo;
