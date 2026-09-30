import type { Candidate, GuardrailDecision, Guardrails, Product, SourcingResult } from '../types'

export const defaultGuardrails: Guardrails = {
  ebayNetMarginPct: 15,
  walmartReferralFeePct: 15,
  minGrossMarginPct: 25,
  maxDeliveryDays: 6,
  minSellerFeedback: 10,
  requireUsSeller: true,
  allowedConditions: ['New', 'New with tags', 'New in box'],
  restrictedUpcPrefix: '2',
}

export const landedCost = (candidate: Candidate) => round(candidate.price + candidate.shipping)

export const grossMarginPct = (sellingPrice: number, cost: number) =>
  sellingPrice > 0 ? round(((sellingPrice - cost) / sellingPrice) * 100) : 0

export const netMarginPct = (sellingPrice: number, cost: number, referralFeePct: number) =>
  sellingPrice > 0
    ? round((((sellingPrice * (1 - referralFeePct / 100)) - cost) / sellingPrice) * 100)
    : 0

export function evaluateCandidate(product: Product, candidate: Candidate, guardrails: Guardrails): GuardrailDecision {
  const cost = landedCost(candidate)
  const net = netMarginPct(product.sellingPrice, cost, guardrails.walmartReferralFeePct)
  const gross = grossMarginPct(product.sellingPrice, cost)
  const conditionOk = guardrails.allowedConditions.some(
    (condition) => condition.toLowerCase() === candidate.condition.toLowerCase(),
  )
  const locationOk = !guardrails.requireUsSeller || candidate.sellerCountry === 'US'
  const deliveryOk = candidate.deliveryDays <= guardrails.maxDeliveryDays
  const feedbackOk = candidate.feedback >= guardrails.minSellerFeedback
  const marginOk = net >= guardrails.ebayNetMarginPct && gross >= guardrails.minGrossMarginPct
  const upcOk = !product.upc.startsWith(guardrails.restrictedUpcPrefix)
  const modelOk = candidate.variantMatch

  const checks = [
    { label: 'Exact variant', passed: modelOk, value: candidate.matchedModel },
    { label: 'Condition', passed: conditionOk, value: candidate.condition },
    { label: 'US seller', passed: locationOk, value: candidate.sellerCountry },
    { label: 'Delivery', passed: deliveryOk, value: `${candidate.deliveryDays} days` },
    { label: 'Seller feedback', passed: feedbackOk, value: candidate.feedback.toLocaleString() },
    { label: 'Net margin', passed: net >= guardrails.ebayNetMarginPct, value: `${net}%` },
    { label: 'Gross margin', passed: gross >= guardrails.minGrossMarginPct, value: `${gross}%` },
    { label: 'UPC allowed', passed: upcOk, value: product.upc },
  ]
  const reasons = checks.filter((check) => !check.passed).map((check) => `${check.label}: ${check.value}`)

  return {
    candidateId: candidate.id,
    eligible: modelOk && conditionOk && locationOk && deliveryOk && feedbackOk && marginOk && upcOk,
    landedCost: cost,
    netMarginPct: net,
    grossMarginPct: gross,
    reasons,
    checks,
  }
}

export function sourceProduct(product: Product, candidates: Candidate[], guardrails: Guardrails): SourcingResult {
  const sorted = [...candidates].sort((a, b) => landedCost(a) - landedCost(b))
  const decisions = sorted.map((candidate) => evaluateCandidate(product, candidate, guardrails))
  const winningDecision = decisions.find((decision) => decision.eligible) ?? null
  const match = winningDecision
    ? sorted.find((candidate) => candidate.id === winningDecision.candidateId) ?? null
    : null

  return {
    product,
    candidates: sorted,
    decisions,
    match,
    matchDecision: winningDecision,
    status: match ? 'matched' : 'rejected',
    summary: match
      ? `${match.seller} selected at $${winningDecision?.landedCost.toFixed(2)} landed cost.`
      : decisions.some((decision) => decision.reasons.some((reason) => reason.startsWith('UPC allowed')))
        ? 'Restricted UPC prefix blocked this product.'
        : 'No candidate passed every quality and profitability gate.',
  }
}

export const round = (value: number) => Math.round(value * 100) / 100
