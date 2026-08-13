import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DivergentFistLab from './DivergentFistLab'

vi.mock('./DivergentFistBattlefield', () => ({
  default: ({ beat }: { beat: string }) => <div data-testid="mock-battlefield">{beat}</div>,
}))

describe('Divergent Fist laboratory controls', () => {
  it('supports the keyboard-only selection, targeting, queue, and resolution path', async () => {
    const user = userEvent.setup()
    render(<DivergentFistLab />)

    const yuji = screen.getByRole('button', { name: 'Select Yuji' })
    yuji.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Yuji selected')

    await user.keyboard('{Tab}{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Divergent Fist selected')
    await user.keyboard('{Tab}{Enter}')
    expect(screen.getByRole('button', { name: 'Confirm target' })).toBeEnabled()
    await user.keyboard('{Tab}{Enter}')
    expect(screen.getByRole('button', { name: 'Queue action' })).toBeEnabled()
    await user.keyboard('{Tab}{Enter}')
    expect(screen.getByText('01 · Yuji / Divergent Fist / Maki')).toBeVisible()
    await user.keyboard('{Tab}{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Resolution started')
  })

  it('resets and can start a full replay without backend state', async () => {
    const user = userEvent.setup()
    render(<DivergentFistLab />)

    await user.click(screen.getByRole('button', { name: 'Replay full sequence' }))
    expect(screen.getByText('Playing')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('mock-battlefield')).toHaveTextContent('planning')
    expect(screen.getByText('Empty')).toBeVisible()
  })
})
