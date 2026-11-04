# SORA PART 2 — Professional Web Dashboard

React + TypeScript + Vite frontend for SORA. Includes the bilingual chat interface, admin console, provider-management UI, browser voice controls, conversation history UI, and a Netlify Function proxy for the PART 1 Render backend.

See `README_BN.md` for the complete Bengali deployment guide.

Never put provider API keys or Supabase service-role keys in frontend environment variables. Only the Supabase anon/publishable key is intended for the browser. Set `BACKEND_URL` as a Netlify server-side environment variable.
