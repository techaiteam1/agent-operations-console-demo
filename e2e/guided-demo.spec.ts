import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByText('Safe demonstration environment')).toBeVisible()
  expect(externalRequests).toEqual([])
})

test('guided happy path reaches a terminal mock result', async ({ page }) => {
  await page.getByRole('button', { name: 'Show completed run' }).click()
  await expect(page.getByText('Mock feed PROCESSED')).toBeVisible()
  await expect(page.getByText('No external marketplace connection exists.')).toBeVisible()
})

test('product explorer explains selection and rejection', async ({ page }) => {
  await page.getByRole('button', { name: 'Product explorer' }).click()
  await expect(page.getByText('Supplier candidates')).toBeVisible()
  await expect(page.getByText('Selected', { exact: true })).toBeVisible()
  await expect(page.getByText(/Condition|Delivery|Exact variant/).first()).toBeVisible()
})

test('resume and partial feed scenarios are selectable', async ({ page }) => {
  await page.getByLabel('Demonstration scenario').selectOption('resume')
  await page.getByRole('button', { name: 'Resume center' }).click()
  await expect(page.getByText('Interrupted sourcing scenario')).toBeVisible()
  await page.getByLabel('Demonstration scenario').selectOption('partial-feed')
  await page.getByRole('button', { name: 'Feed review' }).click()
  await expect(page.getByText('Simulation boundary')).toBeVisible()
})
