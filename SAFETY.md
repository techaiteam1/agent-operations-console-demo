# Demo Safety Boundary

## Non-negotiable properties

- Runtime dependencies do not import any production module.
- Fixture products and sellers are fictional.
- Fixture URLs use `demo://` and cannot resolve over HTTP.
- Browser CSP allows connections only to the local demo origin.
- No environment variables, cookies, credentials, or production output files are read.
- The mock upload adapter returns deterministic in-memory results.

## Feed invariants

A product enters the preview only if:

1. The result is not quarantined.
2. A candidate is explicitly selected.
3. The associated guardrail decision is eligible.
4. Product identity and price fields exist.

A run is never shown as successfully processed without a non-empty synthetic feed ID and a terminal mock status.

## Production separation

The demo is a communication artifact, not an alternative production entry point. It should remain in its own directory and must never gain imports from production `config.ini`, `output/`, browser MCP tools, or the Walmart uploader.
