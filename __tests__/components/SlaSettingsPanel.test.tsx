
jest.mock("../../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SlaSettingsPanel, INCIDENT_TEMPLATES } from '../../src/app/(dashboard)/system/sla-settings-panel';

const defaultSla = { critical: 4, high: 24, medium: 72, low: 168, info: 720 };

describe('SlaSettingsPanel', () => {
  it('renders default values', () => {
    const { container } = render(<SlaSettingsPanel defaultSla={defaultSla} />);
    expect(container.querySelector('input[name="slaCriticalHours"]')).toHaveValue(4);
    expect(container.querySelector('input[name="slaHighHours"]')).toHaveValue(24);
    expect(container.querySelector('input[name="slaMediumHours"]')).toHaveValue(72);
    expect(container.querySelector('input[name="slaLowHours"]')).toHaveValue(168);
  });

  it('updates values when typed into', () => {
    const { container } = render(<SlaSettingsPanel defaultSla={defaultSla} />);
    const critInput = container.querySelector('input[name="slaCriticalHours"]') as HTMLInputElement;
    
    // Test the new fix: emptying the input doesn't force it to 1
    fireEvent.change(critInput, { target: { value: '' } });
    expect(critInput).toHaveValue(null);

    // Test entering a new number
    fireEvent.change(critInput, { target: { value: '8' } });
    expect(critInput).toHaveValue(8);
  });

  it('applies templates', () => {
    const { container } = render(<SlaSettingsPanel defaultSla={defaultSla} templates={INCIDENT_TEMPLATES} />);
    
    const gdprBtn = screen.getByText('GDPR STRICT');
    fireEvent.click(gdprBtn);
    
    expect(container.querySelector('input[name="slaCriticalHours"]')).toHaveValue(1);
    expect(container.querySelector('input[name="slaHighHours"]')).toHaveValue(24);
    expect(container.querySelector('input[name="slaMediumHours"]')).toHaveValue(48);
  });

  it('resets to saved', () => {
    const { container } = render(<SlaSettingsPanel defaultSla={defaultSla} />);
    const critInput = container.querySelector('input[name="slaCriticalHours"]') as HTMLInputElement;
    
    fireEvent.change(critInput, { target: { value: '999' } });
    expect(critInput).toHaveValue(999);
    
    const resetBtn = screen.getByText('RESET TO SAVED');
    fireEvent.click(resetBtn);
    
    expect(critInput).toHaveValue(4);
  });

});
