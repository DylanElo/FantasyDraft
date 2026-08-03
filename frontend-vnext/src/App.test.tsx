import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./Battlefield', () => ({
  default: (props: { sequence: Array<{ message: string }> | null; onSequenceStage: (frame: unknown) => void; onSequenceComplete: (frame: unknown) => void }) => <button onClick={() => {
    props.sequence?.forEach(props.onSequenceStage)
    if (props.sequence?.length) props.onSequenceComplete(props.sequence.at(-1))
  }}>Complete battlefield sequence</button>,
}))

async function reachBattle(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Enter the barrier' }))
  await user.click(screen.getByRole('button', { name: 'Lock formation' }))
  await user.click(screen.getByRole('button', { name: 'Begin encounter' }))
  await screen.findByRole('button', { name: 'Complete battlefield sequence' })
}

describe('vertical-slice flow', () => {
  it('enters team selection with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Enter the barrier' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'Choose your three' })).toBeVisible()
  })

  it('lets the player replace a teammate and reach the matchup with exactly three fighters', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Enter the barrier' }))
    await user.click(screen.getByRole('button', { name: 'Yuji Itadori, selected position 1' }))
    await user.click(screen.getByRole('button', { name: 'Maki Zenin, not selected' }))
    await user.click(screen.getByRole('button', { name: 'Lock formation' }))

    expect(screen.getByRole('heading', { name: 'Barrier breach' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Maki' })).toBeVisible()
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('completes the Yuji to Maki Divergent Fist flow with keyboard-accessible controls', async () => {
    const user = userEvent.setup()
    render(<App />)
    await reachBattle(user)

    const yuji = screen.getByRole('button', { name: /Select Yuji Itadori, 100 health/ })
    yuji.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Yuji Itadori selected')).toBeVisible()

    const divergent = screen.getByRole('button', { name: /Divergent Fist/ })
    divergent.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /Target Maki Zenin, legal target/ })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Target Maki Zenin, legal target/ }))
    expect(screen.getByRole('button', { name: 'Confirm Maki' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirm Maki' }))
    expect(screen.getByRole('region', { name: 'Action queue' })).toHaveTextContent('Yuji → Maki')

    await user.click(screen.getByRole('button', { name: 'Confirm resolution' }))
    expect(screen.getByText('Resolution committed')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Complete battlefield sequence' }))

    expect(screen.getByText('Planning restored. Select a fighter.')).toBeVisible()
    expect(screen.getByRole('button', { name: /Select Maki Zenin, 70 health/ })).toBeDisabled()
  })

  it('keeps the same ordered feedback with reduced motion enabled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await reachBattle(user)

    await user.click(screen.getByRole('button', { name: 'Motion full' }))
    expect(screen.getByRole('button', { name: 'Motion reduced' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /Select Yuji Itadori/ }))
    await user.click(screen.getByRole('button', { name: /Divergent Fist/ }))
    await user.click(screen.getByRole('button', { name: /Target Maki Zenin/ }))
    await user.click(screen.getByRole('button', { name: 'Confirm Maki' }))
    await user.click(screen.getByRole('button', { name: 'Confirm resolution' }))
    await user.click(screen.getByRole('button', { name: 'Complete battlefield sequence' }))

    expect(screen.getByText('Planning restored. Select a fighter.')).toBeVisible()
  })
})
