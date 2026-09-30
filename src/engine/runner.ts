import { candidatesFor, scenarioById } from '../data/scenarios'
import { defaultGuardrails, sourceProduct } from './calculations'
import { FixtureMarketplaceAdapter } from './adapters'
import type {
  AgentEvent,
  Artifact,
  Checkpoint,
  DemoRun,
  Guardrails,
  MockFeed,
  MockFeedItem,
  PipelineStage,
  Product,
  ScenarioDefinition,
  SourcingResult,
  StageId,
} from '../types'

const stageSeed: Omit<PipelineStage, 'status' | 'completion'>[] = [
  { id: 'runner', label: 'Pipeline planning', shortLabel: 'Plan', owner: 'Pipeline Runner' },
  { id: 'collector', label: 'Listing collection', shortLabel: 'Collect', owner: 'Listing Collector' },
  { id: 'scraper', label: 'Product detail scrape', shortLabel: 'Scrape', owner: 'Python worker' },
  { id: 'prepare', label: 'eBay input preparation', shortLabel: 'Prepare', owner: 'Python worker' },
  { id: 'sourcer', label: 'Supplier sourcing', shortLabel: 'Source', owner: 'eBay Sourcer' },
  { id: 'review', label: 'Feed review', shortLabel: 'Review', owner: 'Policy engine' },
  { id: 'upload', label: 'Mock upload', shortLabel: 'Simulate', owner: 'Mock adapter' },
]

const selectedProducts = (scenario: ScenarioDefinition, products: Product[]) => {
  if (scenario.behavior.lowMarginFocus) return products.filter((product) => product.id === 'p-trailforge')
  if (scenario.behavior.restrictedUpcFocus) return products.filter((product) => product.id === 'p-cedarnest')
  if (scenario.behavior.invalidSchema) return products.filter((product) => product.id === 'p-aurora')
  return products
}

export async function buildDemoRun(scenarioId: string, guardrailOverrides?: Partial<Guardrails>): Promise<DemoRun> {
  const scenario = scenarioById(scenarioId)
  const guardrails = { ...defaultGuardrails, ...guardrailOverrides }
  const adapter = new FixtureMarketplaceAdapter(scenario)
  const events: AgentEvent[] = []
  const artifacts: Artifact[] = []
  let sequence = 0
  let elapsed = 0

  const push = (
    stage: StageId,
    agent: string,
    kind: AgentEvent['kind'],
    title: string,
    detail: string,
    extras: Partial<AgentEvent> = {},
  ) => {
    elapsed += kind === 'retry' ? 9 : kind === 'tool' ? 3 : 2
    events.push({
      id: `event-${++sequence}`,
      sequence,
      elapsedSeconds: elapsed,
      stage,
      agent,
      kind,
      title,
      detail,
      ...extras,
    })
  }

  const addArtifact = (artifact: Artifact) => {
    artifacts.push(artifact)
    push(artifact.stage, artifact.stage === 'sourcer' ? 'eBay Sourcer' : 'Pipeline Runtime', 'artifact', `${artifact.name} created`, `${artifact.records} record${artifact.records === 1 ? '' : 's'} · ${artifact.status}`, { artifactId: artifact.id })
  }

  push('runner', 'Pipeline Runner', 'plan', 'Run plan assembled', `Loaded “${scenario.title}” with ${Object.keys(scenario.behavior).length} deterministic behavior flag(s).`, {
    presenterCue: 'Start with the control plane: one agent understands status, delegates specialists, and verifies artifacts.',
  })
  push('runner', 'Pipeline Runner', 'tool', 'Pipeline status reconstructed', 'No prior run artifacts found. Next action: collect catalogue stubs.', { tool: 'pipeline.status' })

  const checkpoint: Checkpoint = {
    doneIds: scenario.behavior.checkpointFiltering ? ['9001006'] : [],
    sourcingDoneIds: scenario.behavior.interruptedResume ? ['9001001', '9001002'] : [],
    resumed: Boolean(scenario.behavior.interruptedResume),
    skippedCount: 0,
  }

  if (scenario.behavior.captchaRetry) {
    push('collector', 'Listing Collector', 'warning', 'Bot challenge detected', 'The catalogue page did not expose product cards; collection paused safely.', { tool: 'browser.read_page' })
    push('collector', 'Listing Collector', 'retry', 'Retry policy engaged', 'Simulated 30-second wait completed. Reopening the same catalogue page.', { tool: 'browser.navigate' })
  }

  push('collector', 'Listing Collector', 'tool', 'Seller catalogue opened', 'Opened synthetic seller “Northwind Demo Supply”. No marketplace account or session is connected.', { tool: 'fixture.collectListings' })
  const collection = await adapter.collectListings(checkpoint)
  checkpoint.skippedCount = collection.skippedCheckpoint
  push('collector', 'Listing Collector', 'decision', 'Pagination exhausted', `${collection.pagesVisited} pages read · ${collection.rawCount} links · ${collection.duplicateCount} duplicate(s) removed · ${collection.skippedCheckpoint} checkpointed item(s) skipped.`, {
    presenterCue: 'Point out that deduplication and checkpoint filtering reduce downstream browser work and cost.',
  })
  addArtifact({ id: 'a-stubs', name: 'stubs.json', stage: 'collector', type: 'json', records: collection.stubs.length, status: 'validated', content: collection.stubs })

  if (scenario.behavior.rateLimitRetry) {
    push('scraper', 'Python worker', 'warning', 'HTTP 429 received', 'Synthetic detail endpoint signalled a rate limit.', { tool: 'fixture.scrapeProduct' })
    push('scraper', 'Python worker', 'retry', 'Exponential backoff', 'Retry 2/5 after a simulated 4-second backoff window.', { tool: 'retry.http' })
  }
  if (scenario.behavior.fetchRecovery) {
    push('scraper', 'Python worker', 'warning', 'Structured payload missing', 'First response did not contain the expected product object; item moved to the retry queue.')
    push('scraper', 'Python worker', 'retry', 'Retry pass recovered product', 'Second fixture response passed structure validation and parsing.')
  }

  const scrapedProducts: Product[] = []
  for (const stub of collection.stubs) scrapedProducts.push(await adapter.scrapeProduct(stub))
  const runProducts = selectedProducts(scenario, scrapedProducts)
  push('scraper', 'Python worker', 'tool', 'Product details normalized', `Parsed ${runProducts.length} product record(s): price, GTIN, model, item ID, weight, and canonical link.`, { tool: 'fixture.scrapeProduct' })
  addArtifact({ id: 'a-latest', name: 'seller_demo_latest.xlsx', stage: 'scraper', type: 'xlsx', records: runProducts.length, status: 'validated', content: runProducts })

  push('prepare', 'Python worker', 'decision', 'Agent context compacted', 'Converted the latest product batch into the exact eight-field sourcing contract.')
  addArtifact({ id: 'a-input', name: 'ebay_input.json', stage: 'prepare', type: 'json', records: runProducts.length, status: 'validated', content: runProducts.map(toAgentInput) })

  if (scenario.behavior.interruptedResume) {
    push('sourcer', 'eBay Sourcer', 'resume', 'Progress checkpoint restored', 'Two completed Walmart item IDs loaded. Their marketplace searches will not be repeated.', {
      artifactId: 'a-progress',
      presenterCue: 'This is durable recovery: a restart preserves both completed work and spend.',
    })
  }

  const results: SourcingResult[] = []
  for (const product of runProducts) {
    if (scenario.behavior.interruptedResume && checkpoint.sourcingDoneIds.includes(product.walmartItemNo)) {
      push('sourcer', 'eBay Sourcer', 'resume', `${product.name} skipped`, 'Already present in sourcing progress; prior verified result restored.')
    }

    let found = false
    for (const strategy of product.searchPath) {
      const search = await adapter.searchListings(product, strategy)
      push('sourcer', 'eBay Sourcer', 'tool', `${searchLabel(strategy)} search`, `Query: “${search.query}” · ${search.candidates.length} viable result URL(s).`, { tool: 'fixture.searchListings' })
      if (search.candidates.length) {
        found = true
        break
      }
      push('sourcer', 'eBay Sourcer', 'decision', 'Search broadened', `Fewer than two usable results; moving to the next configured query strategy.`)
    }

    const verified: typeof candidatesFor extends never ? never : ReturnType<typeof candidatesFor> = []
    if (found) {
      for (const candidate of candidatesFor(product.id)) verified.push(await adapter.verifyListing(candidate))
      push('sourcer', 'eBay Sourcer', 'tool', `${verified.length} listing detail page(s) verified`, 'Condition, seller location, feedback, delivery, variant, price, and shipping captured.', { tool: 'fixture.verifyListing' })
    }
    const sourced = sourceProduct(product, verified, guardrails)
    if (scenario.behavior.invalidSchema) {
      sourced.status = 'quarantined'
      sourced.match = null
      sourced.matchDecision = null
      sourced.summary = 'Required product identity field missing in synthetic agent response.'
      push('sourcer', 'Schema validator', 'error', 'Agent output quarantined', 'The result omitted a required identity field. It is excluded before feed construction.', {
        presenterCue: 'Probabilistic output is surrounded by deterministic validation. Bad records stop here.',
      })
    } else if (sourced.match) {
      push('sourcer', 'eBay Sourcer', 'success', 'Supplier selected', `${sourced.summary} Net margin ${sourced.matchDecision?.netMarginPct}% after the configured referral fee.`, {
        presenterCue: 'Open Product Explorer to show why cheaper-looking alternatives were rejected.',
      })
    } else {
      push('sourcer', 'eBay Sourcer', 'warning', 'No qualifying supplier', `${product.name}: ${sourced.summary}`)
    }
    results.push(sourced)
    checkpoint.sourcingDoneIds = [...new Set([...checkpoint.sourcingDoneIds, product.walmartItemNo])]
    push('sourcer', 'eBay Sourcer', 'artifact', 'Progress committed', `${checkpoint.sourcingDoneIds.length} completed product ID(s) now recoverable.`, { artifactId: 'a-progress' })
  }

  addArtifact({ id: 'a-progress', name: 'ebay_progress.json', stage: 'sourcer', type: 'checkpoint', records: results.length, status: 'updated', content: results })
  addArtifact({ id: 'a-results', name: 'ebay_results.json', stage: 'sourcer', type: 'json', records: results.length, status: scenario.behavior.invalidSchema ? 'quarantined' : 'validated', content: results })

  const feedItems = results.filter(canEnterFeed).map(toFeedItem)
  const excluded = results.length - feedItems.length
  push('review', 'Policy engine', 'decision', 'Deterministic feed gate complete', `${feedItems.length} selected match(es) admitted · ${excluded} unmatched, restricted, or quarantined product(s) excluded.`, {
    presenterCue: 'This is the final safety boundary. No selected supplier means no feed item—ever.',
  })
  addArtifact({ id: 'a-feed-preview', name: 'mock_feed_preview.json', stage: 'review', type: 'feed', records: feedItems.length, status: 'validated', content: buildFeedPreview(feedItems) })

  let feed: MockFeed = {
    id: '', status: 'NOT_SUBMITTED', items: feedItems, succeeded: 0, failed: 0, errors: [], simulated: true,
  }
  if (feedItems.length) {
    push('upload', 'Mock adapter', 'tool', 'Submitting to fixture adapter', 'External network is blocked. The payload remains on this device.', { tool: 'fixture.submitFeed' })
    feed = await adapter.submitFeed(feedItems)
    push('upload', 'Mock adapter', 'success', 'Mock feed received', `${feed.id} · status ${feed.status}.`, { artifactId: 'a-feed-result' })
    push('upload', 'Mock adapter', 'tool', 'Polling mock status', 'Synthetic poll 1/3: IN_PROGRESS.', { tool: 'fixture.pollFeed' })
    feed = await adapter.pollFeed(feed)
    push('upload', 'Mock adapter', feed.status === 'PROCESSED' ? 'success' : 'warning', `Mock feed ${feed.status}`, `${feed.succeeded} succeeded · ${feed.failed} failed.`, {
      presenterCue: 'The demonstration ends at a synthetic terminal result. Nothing was transmitted.',
    })
  } else {
    push('upload', 'Policy engine', 'warning', 'Mock upload withheld', 'No validated supplier matches were eligible for feed construction.')
  }
  addArtifact({ id: 'a-feed-result', name: 'mock_upload_result.json', stage: 'upload', type: 'log', records: feed.items.length, status: feed.status === 'PROCESSED' ? 'validated' : feed.status === 'PARTIAL_ERROR' ? 'updated' : 'quarantined', content: feed })

  return {
    id: `demo-${scenario.id}`,
    scenario,
    sellerAlias: 'Northwind Demo Supply',
    startedAt: '2026-09-30T10:00:00.000Z',
    simulated: true,
    stages: stageSeed.map((stage) => ({ ...stage, status: 'complete', completion: 100 })),
    events,
    artifacts,
    products: runProducts,
    results,
    checkpoint,
    feed,
    guardrails,
  }
}

export function stagesAtCursor(run: DemoRun, cursor: number): PipelineStage[] {
  if (cursor < 0) return stageSeed.map((stage) => ({ ...stage, status: 'pending', completion: 0 }))
  const visible = run.events.slice(0, cursor + 1)
  const active = visible.at(-1)?.stage
  const seen = new Set(visible.map((event) => event.stage))
  const errorStages = new Set(visible.filter((event) => event.kind === 'error').map((event) => event.stage))
  const activeIndex = stageSeed.findIndex((stage) => stage.id === active)

  return stageSeed.map((stage, index) => ({
    ...stage,
    status: errorStages.has(stage.id) ? 'warning' : stage.id === active ? 'running' : seen.has(stage.id) && index < activeIndex ? 'complete' : 'pending',
    completion: stage.id === active ? 64 : seen.has(stage.id) && index < activeIndex ? 100 : 0,
  }))
}

export function recomputeResults(run: DemoRun, guardrails: Guardrails): SourcingResult[] {
  return run.results.map((result) =>
    result.status === 'quarantined'
      ? result
      : sourceProduct(result.product, result.candidates, guardrails),
  )
}

export function downloadableArtifacts(run: DemoRun) {
  return {
    run: { id: run.id, scenario: run.scenario.id, sellerAlias: run.sellerAlias, simulated: true },
    guardrails: run.guardrails,
    checkpoint: run.checkpoint,
    results: run.results,
    feed: run.feed,
    artifacts: run.artifacts.map(({ id, name, type, records, status }) => ({ id, name, type, records, status })),
  }
}

function canEnterFeed(result: SourcingResult) {
  return result.status === 'matched' && Boolean(result.match) && Boolean(result.matchDecision?.eligible)
}

function toFeedItem(result: SourcingResult): MockFeedItem {
  if (!result.match) throw new Error('Invariant violation: unmatched product cannot enter feed')
  return {
    sku: `DEMO-${result.match.id.toUpperCase()}`,
    gtin: result.product.upc.padStart(14, '0'),
    price: result.product.sellingPrice,
    shippingWeight: Math.max(1, Math.round(result.product.weightLb)),
    supplierItemId: result.match.id,
  }
}

function toAgentInput(product: Product) {
  return {
    'Product Name': product.name,
    UPC: product.upc,
    'Walmart Item No': product.walmartItemNo,
    'Weight (LB)': product.weightLb,
    'Walmart SKU': product.walmartSku,
    'Supplier Link': product.supplierLink,
    'Supplier Item No': product.supplierItemNo,
    'Selling Price': product.sellingPrice,
  }
}

function buildFeedPreview(items: MockFeedItem[]) {
  return {
    _simulation: 'LOCAL FIXTURE — NOT FOR SUBMISSION',
    MPItemFeedHeader: { processMode: 'REPLACE', subset: 'EXTERNAL', mart: 'DEMO_US' },
    MPItem: items.map((item) => ({ Item: item })),
  }
}

function searchLabel(strategy: Product['searchPath'][number]) {
  if (strategy === 'full-title') return 'Full-title'
  if (strategy === 'short-title') return 'Short-title fallback'
  return 'UPC fallback'
}
