
jest.mock("../../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { render, screen, fireEvent } from '@testing-library/react'
import { RoleManager } from '@/app/(dashboard)/users/roles/RoleManager'

jest.mock('@/app/(dashboard)/users/roles/actions', () => ({
  createRole: jest.fn(),
  updateRole: jest.fn(),
  deleteRole: jest.fn()
}))

describe('RoleManager Component', () => {
  const mockSystemRole = {
    id: "system-root",
    name: "System Root",
    description: "Root capabilities",
    isSystem: true,
    permissions: ["UPDATE_SYSTEM_SETTINGS"],
    _count: { users: 1 }
  }

  const mockCustomRole = {
    id: "custom-staff",
    name: "Custom Staff",
    description: "Staff capabilities",
    isSystem: false,
    permissions: ["VIEW_DASHBOARD"],
    _count: { users: 5 }
  }

  it('renders View Details for system roles instead of Edit/Delete', () => {
    render(<RoleManager roles={[mockSystemRole]} availablePermissions={["UPDATE_SYSTEM_SETTINGS"]} />)
    
    expect(screen.getByText('System role permissions cannot be altered.')).toBeTruthy()
    expect(screen.getByText('View Details')).toBeTruthy()
    expect(screen.queryByText('Edit')).toBeNull()
    expect(screen.queryByText('Delete')).toBeNull()
  })

  it('renders Edit and Delete for custom roles', () => {
    render(<RoleManager roles={[mockCustomRole]} availablePermissions={["VIEW_DASHBOARD"]} />)
    
    expect(screen.getByText('Edit')).toBeTruthy()
    expect(screen.getByText('Delete')).toBeTruthy()
    expect(screen.queryByText('System role permissions cannot be altered.')).toBeNull()
  })

  it('locks inputs and hides save button when viewing details of a system role', () => {
    render(<RoleManager roles={[mockSystemRole]} availablePermissions={["UPDATE_SYSTEM_SETTINGS"]} />)
    
    // Click View Details
    fireEvent.click(screen.getByText('View Details'))
    
    // Dialog should say View System Role
    expect(screen.getByText('View System Role')).toBeTruthy()
    
    // Inputs should be disabled
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
       expect(input.hasAttribute("disabled")).toBe(true)
    })

    // Save button should NOT be in the document
    expect(screen.queryByText('Save Changes')).toBeNull()
    expect(screen.getByText('Cancel')).toBeTruthy()
  })
})
