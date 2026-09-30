export type StageId = 'runner' | 'collector' | 'scraper' | 'prepare' | 'sourcer' | 'review' | 'upload'
export type StageStatus = 'pending' | 'running' | 'complete' | 'warning' | 'blocked'
export type EventKind = 'plan' | 'tool' | 'decision' | 'artifact' | 'retry' | 'success' | 'warning' | 'error' | 'resume'

export interface PipelineStage {
  id: StageId
  label: string
  shortLabel: string
  owner: string
  status: StageStatus
  completion: number
}

export interface ProductStub {
  item_id: string
  detail_url: string
}

export interface Product {
  id: string
  name: string
  upc: string
  walmartItemNo: string
  weightLb: number
  walmartSku: string
  supplierLink: string
  supplierItemNo: string
  sellingPrice: number
  category: string
  thumbnail: string
  searchPath: Array<'full-title' | 'short-title' | 'upc'>
}

export interface Candidate {
  id: string
  productId: string
  seller: string
  url: string
  price: number
  shipping: number
  condition: string
  deliveryDays: number
  sellerCountry: string
  feedback: number
  matchedModel: string
  variantMatch: boolean
  evidence: string
}

export interface Guardrails {
  ebayNetMarginPct: number
  walmartReferralFeePct: number
  minGrossMarginPct: number
  maxDeliveryDays: number
  minSellerFeedback: number
  requireUsSeller: boolean
  allowedConditions: string[]
  restrictedUpcPrefix: string
}

export interface GuardrailDecision {
  candidateId: string
  eligible: boolean
  landedCost: number
  netMarginPct: number
  grossMarginPct: number
  reasons: string[]
  checks: Array<{ label: string; passed: boolean; value: string }>
}

export interface SourcingResult {
  product: Product
  candidates: Candidate[]
  decisions: GuardrailDecision[]
  match: Candidate | null
  matchDecision: GuardrailDecision | null
  status: 'matched' | 'rejected' | 'quarantined'
  summary: string
}

export interface Artifact {
  id: string
  name: string
  stage: StageId
  type: 'json' | 'xlsx' | 'feed' | 'checkpoint' | 'log'
  records: number
  status: 'created' | 'updated' | 'validated' | 'quarantined'
  content: unknown
}

export interface AgentEvent {
  id: string
  sequence: number
  elapsedSeconds: number
  stage: StageId
  agent: string
  kind: EventKind
  title: string
  detail: string
  tool?: string
  artifactId?: string
  presenterCue?: string
}

export interface Checkpoint {
  doneIds: string[]
  sourcingDoneIds: string[]
  resumed: boolean
  skippedCount: number
}

export interface MockFeedItem {
  sku: string
  gtin: string
  price: number
  shippingWeight: number
  supplierItemId: string
}

export interface MockFeed {
  id: string
  status: 'NOT_SUBMITTED' | 'RECEIVED' | 'IN_PROGRESS' | 'PROCESSED' | 'PARTIAL_ERROR' | 'REJECTED'
  items: MockFeedItem[]
  succeeded: number
  failed: number
  errors: string[]
  simulated: true
}

export interface ScenarioBehavior {
  duplicateListings?: boolean
  checkpointFiltering?: boolean
  captchaRetry?: boolean
  rateLimitRetry?: boolean
  fetchRecovery?: boolean
  forceFallbacks?: boolean
  qualityRejections?: boolean
  lowMarginFocus?: boolean
  interruptedResume?: boolean
  restrictedUpcFocus?: boolean
  partialUpload?: boolean
  invalidSchema?: boolean
}

export interface ScenarioDefinition {
  id: string
  title: string
  shortTitle: string
  description: string
  clientValue: string
  icon: string
  duration: string
  behavior: ScenarioBehavior
}

export interface DemoRun {
  id: string
  scenario: ScenarioDefinition
  sellerAlias: string
  startedAt: string
  simulated: true
  stages: PipelineStage[]
  events: AgentEvent[]
  artifacts: Artifact[]
  products: Product[]
  results: SourcingResult[]
  checkpoint: Checkpoint
  feed: MockFeed
  guardrails: Guardrails
}

export interface CollectionResult {
  pagesVisited: number
  rawCount: number
  duplicateCount: number
  skippedCheckpoint: number
  stubs: ProductStub[]
}

export interface SearchResult {
  strategy: 'full-title' | 'short-title' | 'upc'
  query: string
  candidates: Candidate[]
}

export interface MarketplaceAdapter {
  collectListings(checkpoint: Checkpoint): Promise<CollectionResult>
  scrapeProduct(stub: ProductStub): Promise<Product>
  searchListings(product: Product, strategy: SearchResult['strategy']): Promise<SearchResult>
  verifyListing(candidate: Candidate): Promise<Candidate>
  submitFeed(items: MockFeedItem[]): Promise<MockFeed>
  pollFeed(feed: MockFeed): Promise<MockFeed>
}
