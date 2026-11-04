# SORA — PART 1: Backend ও Central AI Brain

এই ZIP হলো একই SORA প্রজেক্টের Backend অংশ। PART 2-এর Web Dashboard এবং PART 3-এর Android App এই Backend URL ব্যবহার করবে। এটি একা সম্পূর্ণ UI নয়; তিনটি Part একসঙ্গে SORA তৈরি করবে।

## এই Part-এ যা আছে

- Express + TypeScript Backend API
- ১০টি Provider adapter/configuration: Gemini, OpenAI, Claude, DeepSeek, xAI Grok, Mistral, Cohere, Perplexity, Qwen এবং Groq-hosted Llama
- Priority-based automatic routing এবং failure fallback
- Optional multi-model collaboration: Admin/API request-এ `collaborate: true` দিলে সর্বোচ্চ ২টি Model-এর উত্তর নিয়ে একটি synthesis call; default-এ বন্ধ, যাতে খরচ নিয়ন্ত্রণে থাকে
- Admin-only Provider configuration, connection test এবং masked API-key display
- Backend-এ AES-256-GCM দিয়ে API key encryption
- Supabase Auth token validation ও database-backed Admin role check
- Conversation history API: list, messages, rename, pin এবং delete; প্রতিটি query authenticated user-এর ID দিয়ে সীমাবদ্ধ
- Chat message persistence, request validation, CORS allowlist ও per-process rate limiting
- Provider request timeout এবং safer client-facing error responses
- Database-aware health check
- Supabase schema, RLS policy এবং signup profile trigger
- Crypto unit tests

## গুরুত্বপূর্ণ সীমাবদ্ধতা

- Default auto routing একটি Provider বেছে নেয়; নির্দিষ্ট Provider ব্যর্থ হলে পরের eligible Provider চেষ্টা করে। Request body-তে `collaborate: true` দিলে সর্বোচ্চ ২টি eligible Provider parallel-এ উত্তর দেয় এবং প্রথম Provider একটি synthesis call করে। এতে সর্বোচ্চ ৩টি API call হতে পারে; default-এ বন্ধ থাকে এবং UI থেকে opt-in করা উচিত।
- ১০টি Provider-এর configuration আছে; API key না দিলে Provider কাজ করবে না। Free tier/limits Provider ও সময় অনুযায়ী বদলায়; কোনো Free tier-কে lifetime free বলা হচ্ছে না।
- Browser/Cloud Voice UI PART 2-এ থাকবে। এই Backend নিজে Natural Feminine TTS service চালু করে না।
- Rate limiter এক Backend process-এর memory-তে চলে। একাধিক instance-এ shared global rate limiting-এর জন্য Redis/managed store যোগ করতে হবে।
- Conversation save, provider configuration এবং Admin functions-এর জন্য Supabase SQL migration চালাতে হবে।
- npm registry এই তৈরির পরিবেশে DNS error (`EAI_AGAIN`) দিয়েছে। তাই বাস্তব dependency install/full typecheck সম্পন্ন হয়নি; Render deploy-এর সময় install/build চালানো হবে। ভুয়া lockfile যোগ করা হয়নি।

## Deploy করার আগে লাগবে

1. Supabase project
2. Render account
3. Supabase Project URL, anon/publishable key এবং service-role key
4. অন্তত ৩২ অক্ষরের random `ENCRYPTION_SECRET`
5. অন্তত একটি AI Provider API key (ঐচ্ছিকভাবে Render Environment-এ; পরে PART 2 Admin UI থেকেও যোগ করা যাবে)

কোনো Secret ZIP, GitHub repository বা Frontend-এ রাখবেন না। `SUPABASE_SERVICE_ROLE_KEY` শুধু Render Environment-এ থাকবে।

## Render-এ Deploy

1. ZIP extract করুন। `sora-backend-part-1` folder-এর সব ফাইল private GitHub repository-র root-এ upload করুন।
2. Render → New → Web Service → repository connect করুন। Root Directory ফাঁকা রাখুন।
3. Runtime Node.js; Build Command: `npm install --include=dev --no-audit --no-fund && npm run build`; Start Command: `npm start`। `render.yaml` Blueprint-এ এই command দেওয়া আছে।
4. Render → Environment-এ নিচের variables যোগ করুন:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENCRYPTION_SECRET`
   - `APP_URL` এবং `CORS_ORIGINS` (PART 2-এর Netlify URL তৈরি হলে বসাবেন; একাধিক Origin comma দিয়ে আলাদা করুন)
   - চাইলে `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `GROK_API_KEY`, `MISTRAL_API_KEY`, `COHERE_API_KEY`, `PERPLEXITY_API_KEY`, `QWEN_API_KEY`, `GROQ_API_KEY`
5. Deploy শেষে Render URL কপি করে রাখুন। যেমন `https://sora-api-xxxx.onrender.com`। PART 2-তে লাগবে।
6. `https://YOUR-RENDER-SERVICE.onrender.com/api/health` খুলে JSON দেখুন। SQL migration না চালালে Database status healthy হবে না—এটাই সঠিক আচরণ।

## API Endpoints

- `GET /api/health` — backend liveness এবং database readiness
- `GET /api/providers/public` — public provider metadata; কোনো API key নয়
- `POST /api/chat` — authenticated AI chat; optional `collaborate: true` multi-model synthesis
- `GET /api/conversations` — নিজের conversation list
- `GET /api/conversations/:id/messages` — নিজের conversation messages
- `PATCH /api/conversations/:id` — নিজের conversation title/pinned update
- `DELETE /api/conversations/:id` — নিজের conversation delete
- `GET /api/admin/providers` — Admin provider list
- `PUT /api/admin/providers/:id` — Admin provider config update; `clearApiKey: true` দিয়ে saved DB key clear করা যায়
- `POST /api/admin/providers/:id/test` — provider connection test
- `GET /api/admin/stats` — database-backed basic stats

Admin endpoint-এর জন্য Supabase access token এবং `profiles.role = 'admin'` লাগবে। User নিজের conversation ছাড়া অন্য কারও data দেখতে বা বদলাতে পারবে না।

## SQL কখন চালাবেন?

তোমার নির্ধারিত flow অনুযায়ী PART 1 deploy করার পর এখনই SQL চালাতে হবে না। PART 3-এর পর final migration ও Admin Email promotion SQL একসঙ্গে চালানো যাবে। তবে SQL না চালানো পর্যন্ত Auth profile, provider persistence, conversation storage এবং Admin API সম্পূর্ণ কাজ করবে না।

## Local commands

Node.js 22 ব্যবহার করুন:

```bash
npm install
cp .env.example .env
# .env-এ Supabase ও encryption variables দিন
npm run build
npm test
npm start
```

Full build ও live API test-এর জন্য dependency registry access, Supabase credentials এবং অন্তত একটি AI API key প্রয়োজন।
