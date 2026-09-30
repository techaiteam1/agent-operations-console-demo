import { candidatesFor, products } from '../data/scenarios'
import type {
  Candidate,
  Checkpoint,
  CollectionResult,
  MarketplaceAdapter,
  MockFeed,
  MockFeedItem,
  Product,
  ProductStub,
  ScenarioDefinition,
  SearchResult,
} from '../types'

const productByItemId = new Map(products.map((product) => [product.walmartItemNo, product]))

export class FixtureMarketplaceAdapter implements MarketplaceAdapter {
  constructor(private readonly scenario: ScenarioDefinition) {}

  async collectListings(checkpoint: Checkpoint): Promise<CollectionResult> {
    const base = products.map<ProductStub>((product) => ({
      item_id: product.walmartItemNo,
      detail_url: `demo://market/catalog/${product.walmartItemNo}`,
    }))
    const raw = this.scenario.behavior.duplicateListings
      ? [base[0], base[1], base[0], base[2], base[3], base[1], base[4], base[5]]
      : base
    const deduped = [...new Map(raw.map((stub) => [stub.item_id, stub])).values()]
    const checkpointed = this.scenario.behavior.checkpointFiltering ? checkpoint.doneIds : []
    const stubs = deduped.filter((stub) => !checkpointed.includes(stub.item_id))

    return {
      pagesVisited: 3,
      rawCount: raw.length,
      duplicateCount: raw.length - deduped.length,
      skippedCheckpoint: deduped.length - stubs.length,
      stubs,
    }
  }

  async scrapeProduct(stub: ProductStub): Promise<Product> {
    const product = productByItemId.get(stub.item_id)
    if (!product) throw new Error(`Synthetic fixture missing for item ${stub.item_id}`)
    return structuredClone(product)
  }

  async searchListings(product: Product, strategy: SearchResult['strategy']): Promise<SearchResult> {
    const index = product.searchPath.indexOf(strategy)
    const isFinalStrategy = index === product.searchPath.length - 1
    return {
      strategy,
      query: buildQuery(product, strategy),
      candidates: isFinalStrategy ? structuredClone(candidatesFor(product.id)) : [],
    }
  }

  async verifyListing(candidate: Candidate): Promise<Candidate> {
    return structuredClone(candidate)
  }

  async submitFeed(items: MockFeedItem[]): Promise<MockFeed> {
    return {
      id: `DEMO-FEED-${this.scenario.id.toUpperCase().replaceAll('-', '_')}-1042`,
      status: 'RECEIVED',
      items: structuredClone(items),
      succeeded: 0,
      failed: 0,
      errors: [],
      simulated: true,
    }
  }

  async pollFeed(feed: MockFeed): Promise<MockFeed> {
    if (this.scenario.behavior.partialUpload && feed.items.length) {
      return {
        ...feed,
        status: 'PARTIAL_ERROR',
        succeeded: Math.max(0, feed.items.length - 1),
        failed: 1,
        errors: [`SKU ${feed.items.at(-1)?.sku}: synthetic catalogue validation warning`],
      }
    }
    return { ...feed, status: 'PROCESSED', succeeded: feed.items.length, failed: 0 }
  }
}

function buildQuery(product: Product, strategy: SearchResult['strategy']) {
  if (strategy === 'upc') return product.upc
  if (strategy === 'short-title') return `${product.name.split(' ').slice(0, 3).join(' ')} ${product.supplierItemNo}`
  return product.name
}
