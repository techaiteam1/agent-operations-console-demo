# Agent Operations Console — Safe Client Demo

A local-only, deterministic demonstration of the three-agent Walmart/eBay arbitrage workflow. It uses fictional products, sellers, responses, failures, and feed IDs. It does not load production configuration or output and cannot contact external marketplaces.

## Run

```powershell
cd demo
npm install
npm run demo
```

Open `http://127.0.0.1:4173/agent-operations-console-demo/`.

## Published demo

The public GitHub Pages deployment is built automatically from `main`:

<https://techaiteam1.github.io/agent-operations-console-demo/>

The deployment workflow runs the unit tests before building and uses GitHub's
official Pages artifact and deployment actions. Only this standalone demo
repository is published.

## Verify

```powershell
npm test
npm run build
npx playwright install chromium   # one-time, if Chromium is not already installed
npm run test:e2e
```

## Presentation flow

1. Leave the scenario on **Happy path**.
2. Click **Start guided demo** and use the dark presenter-cue banners.
3. Use **Show completed run** if the meeting is short.
4. Open **Product explorer** for candidate evidence.
5. Open **Resume center** and switch to the Resume scenario.
6. Open **Guardrail lab** to change a threshold live.
7. Finish in **Feed review**, stressing the fixture-only adapter.
8. Use **Technical inspector** for architecture-oriented questions.

See [PRESENTER_GUIDE.md](./PRESENTER_GUIDE.md) for the full 15-minute script.

## Safety design

- All marketplace interfaces are implemented by `FixtureMarketplaceAdapter`.
- The CSP blocks external connections.
- All URLs in fixtures use the non-network `demo://` scheme.
- No file imports from the production project exist.
- Feed admission requires a selected candidate and an eligible deterministic guardrail decision.
- A mock run is complete only when it has a synthetic feed ID and explicit terminal status.

## Branding

The current `AgentOps` identity is deliberately neutral. Update the brand name and CSS color variables in `src/App.tsx` and `src/styles.css` when final company assets are available.
