import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/lib/plugins/**/*.{js,ts}',
    '!src/lib/plugins/types.ts',
    '!src/lib/plugins/sdk-types.ts',
    '!src/lib/plugins/sdk-context.ts',
    'src/lib/auth-utils.ts',
    'src/app/(dashboard)/settings/plugins/actions.ts',
    'src/app/(dashboard)/system/actions.ts'
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
