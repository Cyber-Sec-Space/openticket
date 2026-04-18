
jest.mock("../../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { render, screen } from '@testing-library/react'
import PluginStorePage from '@/app/(dashboard)/settings/plugins/store/page'
import { TextEncoder, TextDecoder } from 'util'
Object.assign(global, { TextDecoder, TextEncoder })

// Note: Server Components testing requires rendering them as async functions, 
// but React 19 / Next.js testing environment handles async components natively in RTL if awaited.

jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user1", permissions: ['VIEW_PLUGINS'] } })
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn(), refresh: jest.fn() }),
  redirect: jest.fn(),
}))

jest.mock('@/lib/auth-utils', () => ({
  hasPermission: jest.fn().mockReturnValue(true)
}))

jest.mock('@/lib/db', () => ({
  db: {
    pluginState: {
      findMany: jest.fn().mockResolvedValue([])
    },
    systemSetting: {
      findUnique: jest.fn().mockResolvedValue({ id: "global", systemPlatformUrl: "http://localhost:3000" })
    }
  }
}))

global.fetch = jest.fn()

describe('PluginStorePage Server Component', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear()
    ;(process.env as any).NODE_ENV = "production"
  })

  it('renders Cannot Connect to Plugin Registry when fetch fails or returns invalid structurally', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404
    })

    const jsx = await PluginStorePage()
    render(jsx)

    expect(screen.getByText('Cannot Connect to Plugin Registry')).toBeTruthy()
    consoleSpy.mockRestore()
  })

  it('renders PluginStore cards when registry structurally validates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{
         id: "test-plugin",
         name: "Test Plugin",
         latestVersion: "1.0",
         versions: {
           "1.0": {}
         }
      }]
    })

    const jsx = await PluginStorePage()
    render(jsx)

    expect(await screen.findByText('Test Plugin')).toBeTruthy()
  })
  
  it('filters out maliciously malformed registry manifests', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{
         id: "malformed-plugin",
         // missing name!
         latestVersion: "1.0",
         versions: {
           "1.0": {}
         }
      }]
    })

    const jsx = await PluginStorePage()
    render(jsx)

    // Should render the fallback because the structural array validation filtered 100% of the plugins
    expect(screen.getByText('Cannot Connect to Plugin Registry')).toBeTruthy()
  })
})
