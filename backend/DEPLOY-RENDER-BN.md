# SORA PART 1 — Render Deployment (বাংলা)

1. ZIP Extract করে `sora-backend-part-1` folder-এর ভেতরের সব ফাইল private GitHub repository-র root-এ রাখুন।
2. Render → New → Web Service → GitHub repository নির্বাচন করুন।
3. Root Directory ফাঁকা রাখুন। Runtime Node.js।
4. Build Command: `npm install --include=dev --no-audit --no-fund && npm run build`
5. Start Command: `npm start`
6. Environment Variables দিন: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_SECRET`, `APP_URL`, `CORS_ORIGINS`। AI Provider key চাইলে দিন; সবগুলো লাগবে না।
7. Deploy শেষে Render URL কপি করে রাখুন। `/api/health` endpoint খুলে database status দেখুন।

**গুরুত্বপূর্ণ:** Supabase SQL migration এখনই চালাবেন না—তোমার পরিকল্পনা অনুযায়ী PART 3-এর পরে final SQL/Admin setup করব। SQL না চলা পর্যন্ত Database-dependent feature কাজ করবে না।

`ENCRYPTION_SECRET` অন্তত ৩২ অক্ষরের random secret হতে হবে এবং Provider key save করার পর এটি বদলানো যাবে না; বদলালে আগের encrypted key decrypt হবে না। Service-role key কখনো Frontend বা ZIP-এ দেবেন না।

এই build environment-এ npm registry DNS `EAI_AGAIN` হওয়ায় dependency installation/full typecheck এখানে সম্পন্ন করা যায়নি। Render-এর build stage-এ npm install ও typecheck চলবে; build ব্যর্থ হলে deployment complete হবে না।
