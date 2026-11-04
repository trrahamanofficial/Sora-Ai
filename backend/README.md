# SORA Part 1 — Backend & Central AI Brain

This is Part 1 of the shared SORA project. It provides the Express/TypeScript backend consumed by the Part 2 web dashboard and Part 3 Android client.

## Included

- Ten provider adapters/configurations: Gemini, OpenAI, Anthropic Claude, DeepSeek, xAI Grok, Mistral, Cohere, Perplexity, Qwen, and Groq-hosted Llama.
- Cost-conscious priority routing and sequential fallback by default.
- Optional `collaborate: true` chat mode: at most two independent model responses plus one synthesis call; disabled by default.
- Admin-only provider configuration, connection tests, masked API-key output, and AES-256-GCM encrypted key storage.
- Supabase Auth verification, database-backed admin roles, RLS migration, and per-user conversation history endpoints.
- Provider timeouts, input validation, CORS allowlist, per-process rate limiting, and database-aware health checks.

## Deploy

Use Node 22. On Render, deploy this folder as a Web Service with build command `npm install --include=dev --no-audit --no-fund && npm run build` and start command `npm start`. Configure the variables in `.env.example` in Render Environment. Never commit secrets or expose the Supabase service-role key to the browser.

The Supabase migration and admin promotion SQL are provided in `supabase/migrations/001_sora.sql` and `supabase/ADMIN-SETUP-TEMPLATE.sql`. Follow the Bengali guide for the planned order of setup.

## Verification status

The TypeScript source syntax check and seven isolated unit tests passed in the packaging environment. Full npm dependency installation/typecheck and live Supabase/provider/Render tests could not be completed because npm registry DNS was unavailable (`EAI_AGAIN`) and the user's credentials/accounts are not available. No fake lockfile or fake live test result is included.
