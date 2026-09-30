# 15-Minute Presenter Guide

## Before the meeting

1. Run `npm run build` and `npm test`.
2. Start with `npm run demo` and open `http://127.0.0.1:4173`.
3. Keep the **Happy path** scenario selected.
4. Click the reset icon so the console begins in its clean state.
5. Keep browser zoom at 100%; 1440×900 or 1920×1080 is ideal.

## 0:00–1:00 — Business problem and team

Say: “Marketplace sourcing is not one task. It is discovery, structured extraction, supplier research, commercial policy, and operational hand-off. We assign each responsibility to the cheapest capable worker and keep one agent accountable for the whole run.”

Show the three agent cards. Emphasize Haiku for lower-cost discovery and Sonnet for orchestration/judgment.

## 1:00–3:00 — Pipeline Runner

Start the guided demo. Explain that the runner reconstructs status from artifacts, creates the run plan, delegates, and stops on missing evidence. Open the technical inspector briefly to show structured events rather than hidden reasoning.

## 3:00–5:00 — Listing Collector

Pause on the pagination event. Explain page caps, duplicate removal, and checkpoint filtering. The client value is complete catalogue coverage without repeatedly paying for the same item.

## 5:00–7:00 — Product detail extraction

Show the latest-XLSX and compact-input artifact events. Explain that deterministic Python handles structure and calculations while agents handle browser uncertainty and semantic matching.

## 7:00–11:00 — eBay Sourcer

Open Product Explorer. Select Northstar to show short-title fallback and LumaDesk to show UPC fallback. Walk through rejected candidates: wrong variant, condition, country, delivery, feedback, or margin. Show that the cheapest listing is not automatically the selected listing.

## 11:00–13:00 — Resume

Switch the scenario to **Resume state**, then open Resume Center. Explain per-product commits and how completed IDs prevent repeated searches after an interruption.

## 13:00–15:00 — Guardrails and safe hand-off

Open Guardrail Lab and raise the margin floor to show immediate impact. Finish in Feed Review. State clearly: “This is a feed-shaped local artifact. No account is connected, and no external API is called.” Simulate submission and show the synthetic terminal result.

## Likely client questions

**Is this using our account?**  
No. The demo has no credentials, session, or external marketplace connector. The browser CSP blocks external hosts.

**Can the thresholds be changed?**  
Yes. The production rules are configuration-driven; the Guardrail Lab demonstrates their effect without changing production.

**What happens if a website blocks the agent?**  
Show CAPTCHA Retry or HTTP Backoff. The system detects failure, applies a bounded retry, and preserves completed work.

**Can an agent hallucination become a listing?**  
Show Invalid Schema. Agent output is quarantined, and feed admission requires a selected candidate plus deterministic validation.

**What is genuinely implemented versus simulated?**  
Open Architecture & Safety. The workflow, schemas, calculations, state transitions, and guardrails are real; external responses and side effects are fixtures.

**Can we review before upload?**  
Yes. Feed Review is designed as the human approval boundary. The demo never performs a real upload.

## Recovery if the meeting goes off-script

- Click the reset icon to restore the opening state.
- Use **Show completed run** to jump to the final evidence.
- Switch scenarios from the left sidebar; every scenario is deterministic.
- If time is short, show Command Center → Product Explorer → Feed Review only.
