# SORA Part 1 — Changelog

## 1.2.0 — Backend hardening and history API

- Added authenticated conversation list, message history, rename, pin and delete endpoints with explicit ownership checks.
- Added opt-in multi-model collaboration: at most two parallel source models and one synthesis call; disabled by default.
- Tightened provider configuration request validation and URL validation.
- Added provider HTTP request timeouts and a bounded wait for Gemini SDK calls.
- Prevented raw third-party provider error payloads from being returned by the chat endpoint.
- Added last-successful-request tracking to provider configuration and migration schema.
- Preserved environment API keys if a saved encrypted key cannot be decrypted; surfaced a provider error instead.
- Added executable AES-256-GCM crypto tests.
- Added Render build-time TypeScript check command; full build still requires npm registry access.
