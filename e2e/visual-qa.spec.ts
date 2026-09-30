import { expect, test } from '@playwright/test'

test('capture presentation views and check horizontal overflow', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByText('Safe demonstration environment')).toBeVisible()
  await page.getByRole('button', { name: 'Show completed run' }).click()

  const views = [
    ['command', 'Command center'],
    ['products', 'Product explorer'],
    ['guardrails', 'Guardrail lab'],
    ['feed', 'Feed review'],
    ['architecture', 'Architecture & safety'],
  ] as const

  for (const [name, label] of views) {
    if (name !== 'command') await page.getByRole('button', { name: label }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })
  }
})
