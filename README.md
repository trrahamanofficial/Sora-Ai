# SORA A–Z Unified Project

This repository combines the SORA backend, web AI interface, and Android app.

- `backend/`: Express + TypeScript API for Render.
- `web/`: React + Vite AI chat interface for Netlify.
- `android/`: Kotlin Android Studio project.

The public AI interface contains no Admin button, menu, or admin page entry point. Server-side admin APIs remain protected by backend authorization and are not exposed in the user interface.

No concrete live Render URL or Supabase project URL/key was present in the supplied archives; only placeholders were present. Configure the real values using `.env.example`, `backend/.env.example`, `web/.env.example`, and `android/local.properties.example`. Never put provider secrets or the Supabase service-role key in browser or APK code.

Build commands and deployment instructions are in `README_BN.md`.

Verification is limited to archive integrity and static/source checks in this environment. Dependency installation timed out, so full TypeScript/Vite and Android Gradle builds and live integrations are not represented as passing.
