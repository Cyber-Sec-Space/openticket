import { cn } from './utils'

describe('cn utility', () => {
  it('merges tailwind class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
    expect(cn('bg-red-500', undefined, 'text-white', null, false, 'p-4')).toBe('bg-red-500 text-white p-4')
  })

  it('handles overrides with tailwind-merge', () => {
    expect(cn('p-4 p-2')).toBe('p-2') // p-2 overrides p-4
    expect(cn('px-4', 'p-2')).toBe('p-2')
  })
})
