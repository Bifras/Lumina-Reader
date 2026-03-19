import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useKeyboardShortcuts } from '../hooks'

function TestShortcuts({
  handlers,
}: {
  handlers: Parameters<typeof useKeyboardShortcuts>[0]
}) {
  useKeyboardShortcuts(handlers)
  return <div>shortcuts</div>
}

describe('useKeyboardShortcuts', () => {
  it('prevents default when configured', () => {
    const action = vi.fn()

    render(
      <TestShortcuts
        handlers={[
          { key: '1-9', ctrlOrMeta: true, preventDefault: true, action },
        ]}
      />
    )

    const event = new KeyboardEvent('keydown', {
      key: '1',
      ctrlKey: true,
      cancelable: true,
    })

    window.dispatchEvent(event)

    expect(action).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not prevent default when not configured', () => {
    const action = vi.fn()

    render(
      <TestShortcuts
        handlers={[
          { key: 'Escape', action },
        ]}
      />
    )

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    })

    window.dispatchEvent(event)

    expect(action).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(false)
  })
})
