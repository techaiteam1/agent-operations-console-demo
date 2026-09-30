import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('client console', () => {
  it('makes the simulation boundary unmissable', async () => {
    render(<App />)
    expect(screen.getByText('Safe demonstration environment')).toBeInTheDocument()
    expect(screen.getByText('Offline fixture mode')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Start guided demo')).toBeInTheDocument())
  })

  it('shows each specialist agent', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getAllByText('Pipeline Runner').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Listing Collector').length).toBeGreaterThan(0)
    expect(screen.getAllByText('eBay Sourcer').length).toBeGreaterThan(0)
  })
})
