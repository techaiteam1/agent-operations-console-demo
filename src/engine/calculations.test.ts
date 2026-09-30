import { describe, expect, it } from 'vitest'
import { candidatesFor, products } from '../data/scenarios'
import { defaultGuardrails, evaluateCandidate, grossMarginPct, landedCost, netMarginPct, sourceProduct } from './calculations'

describe('commercial calculations', () => {
  it('calculates landed cost, gross margin, and fee-adjusted net margin', () => {
    const candidate = candidatesFor('p-aurora')[0]
    expect(landedCost(candidate)).toBe(58)
    expect(grossMarginPct(119, 58)).toBe(51.26)
    expect(netMarginPct(119, 58, 15)).toBe(36.26)
  })

  it('selects the cheapest candidate that passes every gate', () => {
    const product = products.find((item) => item.id === 'p-aurora')!
    const result = sourceProduct(product, candidatesFor(product.id), defaultGuardrails)
    expect(result.match?.id).toBe('c-a1')
    expect(result.matchDecision?.eligible).toBe(true)
    expect(result.decisions[0].eligible).toBe(false) // used item is cheaper
  })

  it.each([
    ['wrong variant', 'c-l1', 'Exact variant'],
    ['non-US seller', 'c-n2', 'US seller'],
    ['low feedback', 'c-n3', 'Seller feedback'],
    ['slow delivery', 'c-a2', 'Delivery'],
    ['used condition', 'c-a3', 'Condition'],
  ])('rejects %s', (_label, candidateId, reason) => {
    const candidate = [...candidatesFor('p-lumadesk'), ...candidatesFor('p-northstar'), ...candidatesFor('p-aurora')].find((item) => item.id === candidateId)!
    const product = products.find((item) => item.id === candidate.productId)!
    expect(evaluateCandidate(product, candidate, defaultGuardrails).reasons.some((item) => item.startsWith(reason))).toBe(true)
  })

  it('blocks restricted UPC products even when commercial gates pass', () => {
    const product = products.find((item) => item.id === 'p-cedarnest')!
    const result = sourceProduct(product, candidatesFor(product.id), defaultGuardrails)
    expect(result.match).toBeNull()
    expect(result.decisions[0].reasons).toContain(`UPC allowed: ${product.upc}`)
  })

  it('rejects operationally valid candidates below the margin floor', () => {
    const product = products.find((item) => item.id === 'p-trailforge')!
    const result = sourceProduct(product, candidatesFor(product.id), defaultGuardrails)
    expect(result.match).toBeNull()
    expect(result.decisions[0].netMarginPct).toBeLessThan(defaultGuardrails.ebayNetMarginPct)
  })
})
