# SORA PART 2 — Professional Web Dashboard

এই ZIP হলো SORA-এর Web Frontend: AI Chat, Admin Dashboard, Provider Management UI, বাংলা/ইংরেজি UI, Browser Voice UI এবং Conversation History UI। এটি PART 1 Backend-এর সঙ্গে কাজ করার জন্য তৈরি।

## PART 2-এ কী আছে

- React + TypeScript + Vite Web App
- আলাদা Admin Console (`/admin`)
- Supabase Auth UI (Sign in / Sign up)
- AI Chat UI ও provider selector (Auto routing সহ)
- Multi-AI collaboration opt-in toggle (অতিরিক্ত API call/খরচ হতে পারে)
- Conversation history load/open/delete UI
- Browser speech recognition ও speech synthesis controls (সমর্থন browser/device অনুযায়ী)
- Provider configuration, key input, enable/disable, priority, model এবং connection-test UI
- Netlify Function API proxy — Browser bundle-এ Render backend URL hard-code করা হয় না
- Mobile responsive layout

## গুরুত্বপূর্ণ: কোন কাজ তোমার করতে হবে

তোমাকে কোনো Source Code ফাইল edit করতে হবে না। তবে নিজের অ্যাকাউন্টের URL/Key Netlify Environment Variables-এ বসাতে হবে। API Key বা Supabase service-role key কখনো এই ZIP বা `VITE_` variable-এ দেবে না।

## Deploy করার আগে প্রয়োজন

1. PART 1 Backend Render-এ deploy করা থাকতে হবে।
2. Supabase Project তৈরি করা থাকতে হবে; SQL migration/Admin promotion তুমি শেষের ধাপে চালাবে।
3. PART 1 Render URL সংরক্ষণ করতে হবে।

## Netlify Environment Variables

Netlify → Site configuration → Environment variables-এ যোগ করো:

- `VITE_SUPABASE_URL` = তোমার Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase anon/publishable key (এটি frontend-এ প্রকাশযোগ্য key)
- `BACKEND_URL` = Render Backend-এর origin, যেমন `https://sora-api-xxxx.onrender.com`। শেষে `/api` দেবে না।

এই `BACKEND_URL` Netlify Function ব্যবহার করে। এটি `VITE_` variable নয় এবং browser bundle-এ যায় না। Function সরাসরি `/api/*` route handle করে; `netlify.toml`-এ আলাদা `/api` rewrite যোগ করার প্রয়োজন নেই।

## Netlify Deploy — সহজ ধাপ

ZIP extract করে `sora-part-2` folder-এর contents একটি GitHub repository-র root-এ রাখো (অথবা folder-টিকেই repository root করো)। তারপর:

1. Netlify → Add new site → Import an existing project → GitHub repository নির্বাচন করো।
2. Base directory ফাঁকা রাখো।
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Node version `22.16.0` (`.nvmrc` ও `netlify.toml`-এ নির্ধারিত)।
6. উপরের Environment Variables যোগ করে Deploy করো।
7. Deploy শেষে `https://YOUR-SITE.netlify.app/api/health` খুলে backend status দেখো। Build সফল হয়েছে কি না নিশ্চিত না হয়ে deploy success ধরে নেবে না।

**শুধু ZIP-টি Netlify-এর manual drag-and-drop deploy-এ ফেলবে না।** Source ZIP-এ dependency install ও build করতে হয়; Git import বা Netlify CLI দিয়ে build করো।

## Render CORS

Netlify site URL পাওয়ার পর Render → Environment-এ PART 1-এর `APP_URL` এবং `CORS_ORIGINS`-এ ঠিক সেই `https://...netlify.app` origin বসাও। তারপর Render service redeploy/restart করো।

## Voice সীমাবদ্ধতা

এই Part-এর Voice UI browser-এর Web Speech API ব্যবহার করে। Speech recognition বা voice selection Android Chrome/অন্যান্য browser অনুযায়ী বদলাতে পারে; এটি আলাদা Natural Cloud TTS service নয়। Cloud Feminine TTS পরবর্তী integration/credential লাগবে এবং browser voice-কে human-grade cloud voice বলা হচ্ছে না।

## Build & Local Run

Node.js 22.16.0 বা compatible Node 20.19+:

```bash
npm install
cp .env.example .env
# .env-এ Supabase URL এবং anon key বসাও
npm run typecheck
npm run build
npm run dev
```

## Troubleshooting

- `Backend is not configured`: Netlify-তে `BACKEND_URL` যোগ করে নতুন deploy করো।
- `/api/health` 502: Render service URL/health status পরীক্ষা করো।
- CORS error: Render `APP_URL` ও `CORS_ORIGINS`-এ Netlify origin যোগ করো।
- Login কাজ না করলে: Supabase URL/anon key, Auth URL configuration এবং SQL/profile setup যাচাই করো।
- Admin page access denied: SQL migration এবং নির্দিষ্ট Admin email promotion শেষ না হওয়া পর্যন্ত Admin UI ব্যবহার করা যাবে না।
