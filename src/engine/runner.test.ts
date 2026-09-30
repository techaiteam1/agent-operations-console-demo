import { describe, expect, it } from 'vitest'
import { FixtureMarketplaceAdapter } from './adapters'
import { buildDemoRun, downloadableArtifacts } from './runner'
import { scenarioById } from '../data/scenarios'

describe('offline scenario engine', () => {
  it('deduplicates catalogue links and filters checkpointed products', async () => {
    const adapter = new FixtureMarketplaceAdapter(scenarioById('pagination'))
    const result = await adapter.collectListings({ doneIds: ['9001006'], sourcingDoneIds: [], resumed: false, skippedCount: 0 })
    expect(result.duplicateCount).toBeGreaterThan(0)
    expect(result.skippedCheckpoint).toBe(1)
    expect(new Set(result.stubs.map((stub) => stub.item_id)).size).toBe(result.stubs.length)
  })

  it('runs every search fallback in the fallback scenario', async () => {
    const run = await buildDemoRun('search-fallbacks')
    const titles = run.events.map((event) => event.title)
    expect(titles).toContain('Full-title search')
    expect(titles).toContain('Short-title fallback search')
    expect(titles).toContain('UPC fallback search')
  })

  it('emits retry evidence for CAPTCHA, rate limit, and fetch recovery scenarios', async () => {
    for (const scenario of ['captcha-retry', 'rate-limit', 'fetch-recovery']) {
      const run = await buildDemoRun(scenario)
      expect(run.events.some((event) => event.kind === 'retry')).toBe(true)
    }
  })

  it('restores sourcing progress without losing completed identifiers', async () => {
    const run = await buildDemoRun('resume')
    expect(run.checkpoint.resumed).toBe(true)
    expect(run.events.some((event) => event.kind === 'resume')).toBe(true)
    expect(run.checkpoint.sourcingDoneIds.length).toBeGreaterThanOrEqual(2)
  })

  it('quarantines invalid agent output and never admits it to a feed', async () => {
    const run = await buildDemoRun('invalid-schema')
    expect(run.results[0].status).toBe('quarantined')
    expect(run.results[0].match).toBeNull()
    expect(run.feed.items).toHaveLength(0)
    expect(run.feed.status).toBe('NOT_SUBMITTED')
  })

  it('never admits an unmatched product into the mock feed', async () => {
    const run = await buildDemoRun('happy-path')
    const admittedSupplierIds = new Set(run.feed.items.map((item) => item.supplierItemId))
    for (const result of run.results) {
      if (!result.match) expect([...admittedSupplierIds].some((id) => result.candidates.some((candidate) => candidate.id === id))).toBe(false)
    }
  })

  it('only reports completion with a feed id and terminal result', async () => {
    const successful = await buildDemoRun('happy-path')
    expect(successful.feed.id).toMatch(/^DEMO-FEED-/)
    expect(['PROCESSED', 'PARTIAL_ERROR']).toContain(successful.feed.status)

    const noFeed = await buildDemoRun('invalid-schema')
    expect(noFeed.feed.id).toBe('')
    expect(noFeed.feed.status).toBe('NOT_SUBMITTED')
  })

  it('returns an explicit item-level error for a partial feed', async () => {
    const run = await buildDemoRun('partial-feed')
    expect(run.feed.status).toBe('PARTIAL_ERROR')
    expect(run.feed.failed).toBe(1)
    expect(run.feed.errors).toHaveLength(1)
  })

  it('exports only synthetic, inspectable run evidence', async () => {
    const exported = downloadableArtifacts(await buildDemoRun('happy-path'))
    const serialized = JSON.stringify(exported)
    expect(serialized).toContain('simulated')
    expect(serialized).not.toContain('client_secret')
    expect(serialized).not.toContain('marketplace.walmartapis.com')
  })
})
